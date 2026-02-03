import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import session from 'express-session';
import { google } from 'googleapis';
const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173', credentials: true })); // adjust React port if needed
app.use(session({ secret: 'supersecret', resave: false, saveUninitialized: false }));

const google_client_Id = process.env.GOOGLE_CLIENT_ID;
const google_client_Secret = process.env.Google_Client_Secret;
const REDIRECT_URI = 'http://localhost:5000/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/contacts.readonly'];

const oauth2Client = new google.auth.OAuth2(google_client_Id, google_client_Secret, REDIRECT_URI);

// MongoDB Connection

mongoose.connect('mongodb://localhost:27017/contactmanager')
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log("DB Error", err));


const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    phoneNormalized: { type: String, required: true }, // <-- NEW (important)
    type: { type: String, default: 'personal' },
    email: { type: String },
    avatar: { type: String },
    initial: { type: String },
    userId: { type: String, required: true },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    createdAt: { type: Date, default: Date.now }
});

// Indexes
contactSchema.index({ location: '2dsphere' });
contactSchema.index({ phoneNormalized: 1, userId: 1 }, { unique: true });

const DatasetSchema = new mongoose.Schema({
    phone: { type: String, required: true },
    name: { type: String, required: true },
    userId: { type: String, required: true }
});

DatasetSchema.index({ phone: 1, userId: 1 }, { unique: true });

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    userId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const todoSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date }, // optional
    isCompleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);
const Dataset = mongoose.model('Dataset', DatasetSchema);
const Group = mongoose.model('Group', groupSchema);
const User = mongoose.model('User', userSchema);
const Todo = mongoose.model('Todo', todoSchema);

// Middleware to verify user
const verifyUser = (req, res, next) => {
    const userId = req.headers['user-id'];
    if (!userId) {
        return res.status(401).json({ message: 'User ID required' });
    }
    req.userId = userId;
    next();
};

// User Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;


        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Create user
        const user = new User({
            username,
            email,
            password
        });

        await user.save();

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        if (user.password !== password) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.get('/api/contacts', verifyUser, async (req, res) => {
    try {
        const contacts = await Contact.find({ userId: req.userId });
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.post('/api/contacts', verifyUser, async (req, res) => {
    try {
        const { name, phone, email, avatar, initial, type, location } = req.body;
        const normalizedPhone = phone.replace(/\D/g, '');

        const existingContact = await Contact.findOne({
            phoneNormalized: normalizedPhone,
            userId: req.userId
        });


        if (existingContact) {
            return res.status(400).json({
                message: 'Phone number already exists in contacts',
                existingContact: {
                    name: existingContact.name,
                    phone: existingContact.phone
                }
            });
        }

        const existingName = await Contact.findOne({
            name: { $regex: `^${name}$`, $options: 'i' },
            userId: req.userId
        });

        if (existingName) {
            return res.status(400).json({
                message: 'Name already exists',
                existingContact: {
                    name: existingName.name,
                    phone: existingName.phone
                }
            });
        }
        const contact = new Contact({
            name,
            phone,
            phoneNormalized: normalizedPhone,
            email,
            avatar,
            initial,
            type,
            location: location ? {
                type: 'Point',
                coordinates: [location.lng, location.lat]
            } : undefined,
            userId: req.userId
        });

        await contact.save();
        res.status(201).json(contact);

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


app.put('/api/contacts/:id', verifyUser, async (req, res) => {
    try {
        const { phone } = req.body;

        if (phone) {
            const normalizedPhone = phone.replace(/\D/g, '');
            const existingContact = await Contact.findOne({
                phoneNormalized: normalizedPhone,
                userId: req.userId,
                _id: { $ne: req.params.id }
            });

            if (existingContact) {
                return res.status(400).json({
                    message: 'Phone number already exists in contacts',
                    existingContact: {
                        name: existingContact.name,
                        phone: existingContact.phone
                    }
                });
            }
        }

        const { name, email, avatar, type, location } = req.body;

        const updatedContact = await Contact.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            {
                name,
                phone,
                email,
                avatar,
                initial: name.charAt(0).toUpperCase(),
                type,
                location: location ? {
                    type: 'Point',
                    coordinates: [location.lng, location.lat]
                } : undefined
            },
            { new: true } // return the updated document
        );

        if (!updatedContact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        res.json(updatedContact);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


app.delete('/api/contacts/:id', verifyUser, async (req, res) => {
    try {
        const contact = await Contact.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        // Remove contact from all groups
        await Group.updateMany(
            { userId: req.userId },
            { $pull: { members: req.params.id } }
        );

        res.json({ message: 'Contact deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get contacts near user's location
app.get('/api/contacts/nearby', verifyUser, async (req, res) => {
    try {
        const { lat, lng, radius = 5 } = req.query; // radius in km
        if (!lat || !lng) return res.status(400).json({ message: 'Latitude and longitude required' });

        const nearbyContacts = await Contact.find({
            userId: req.userId,
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                    $maxDistance: radius * 1000 // convert km to meters
                }
            }
        });

        res.json(nearbyContacts);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});
// GET all dataset entries for the user
app.get('/api/dataset', verifyUser, async (req, res) => {
    try {
        const dataset = await Dataset.find({ userId: req.userId });
        res.json(dataset);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.get('/api/dataset/:phone', verifyUser, async (req, res) => {
    try {
        const contact = await Dataset.findOne({ phone: req.params.phone });
        if (contact) {
            res.json({ found: true, name: contact.name, phone: contact.phone });
        } else {
            res.status(404).json({ found: false, message: 'Number not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.post('/api/dataset', verifyUser, async (req, res) => {
    try {
        const { phone, name } = req.body;

        if (!phone || !name) {
            return res.status(400).json({ message: 'Phone and Name are required' });
        }

        // Check if already exists
        const existing = await Dataset.findOne({ phone, userId: req.userId });
        if (existing) {
            return res.status(400).json({ message: 'Phone already exists', contact: existing });
        }

        const contact = new Dataset({
            phone,
            name,
            userId: req.userId,
        });

        await contact.save();
        res.status(201).json({ success: true, contact });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Group Routes
app.get('/api/groups', verifyUser, async (req, res) => {
    try {
        const groups = await Group.find({ userId: req.userId })
            .populate('members', 'name phone avatar initial');
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.post('/api/groups', verifyUser, async (req, res) => {
    try {
        const { name, description, members } = req.body;

        const group = new Group({
            name,
            description,
            members: members || [],
            userId: req.userId
        });

        await group.save();
        await group.populate('members', 'name phone avatar initial');
        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.put('/api/groups/:id', verifyUser, async (req, res) => {
    try {
        const group = await Group.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            req.body,
            { new: true }
        ).populate('members', 'name phone avatar initial');

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        res.json(group);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.delete('/api/groups/:id', verifyUser, async (req, res) => {
    try {
        const group = await Group.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get todos
app.get('/api/todos', verifyUser, async (req, res) => {
    try {
        const { filter = 'all' } = req.query;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let filterCondition = { userId: req.userId };

        if (filter === 'today') {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            filterCondition.dueDate = { $gte: today, $lt: tomorrow };
        } else if (filter === 'upcoming') {
            filterCondition.dueDate = { $gte: today };
        } else if (filter === 'past') {
            filterCondition.dueDate = { $lt: today };
        }

        const todos = await Todo.find(filterCondition).sort({ dueDate: 1 });
        res.json(todos);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create new todo
app.post('/api/todos', verifyUser, async (req, res) => {
    try {
        const { description, dueDate } = req.body;
        if (!description) return res.status(400).json({ message: 'Description is required' });

        const todo = new Todo({
            description,
            dueDate: dueDate || null,
            userId: req.userId
        });

        await todo.save();
        res.status(201).json(todo);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update todo
app.put('/api/todos/:id', verifyUser, async (req, res) => {
    try {
        const todo = await Todo.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            req.body,
            { new: true }
        );
        if (!todo) return res.status(404).json({ message: 'Todo not found' });
        res.json(todo);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete todo
app.delete('/api/todos/:id', verifyUser, async (req, res) => {
    try {
        const todo = await Todo.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!todo) return res.status(404).json({ message: 'Todo not found' });
        res.json({ message: 'Todo deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Mark todo as completed
app.patch('/api/todos/:id/complete', verifyUser, async (req, res) => {
    try {
        const todo = await Todo.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { isCompleted: true },
            { new: true }
        );
        if (!todo) return res.status(404).json({ message: 'Todo not found' });
        res.json(todo);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Google contacts integration
app.get('/auth-url', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    res.json({ url });
});
// Handle OAuth callback
app.get('/oauth2callback', async (req, res) => {
    try {
        const { code } = req.query;
        const { tokens } = await oauth2Client.getToken(code);
        req.session.tokens = tokens;
        res.redirect("http://localhost:5173/contacts?sync_ready=1");

    } catch (err) {
        console.error('OAuth callback error:', err);
        res.status(500).send('Authentication failed');
    }
});
// Import Google contacts and save them for the verified user
app.post('/contacts/import-google', verifyUser, async (req, res) => {
    try {
        if (!req.session.tokens) {
            return res.status(401).json({ error: 'Not authenticated with Google' });
        }

        oauth2Client.setCredentials(req.session.tokens);
        const service = google.people({ version: 'v1', auth: oauth2Client });

        const result = await service.people.connections.list({
            resourceName: 'people/me',
            pageSize: 2000,
            personFields: 'names,emailAddresses,phoneNumbers',
        });

        const connections = result.data.connections || [];

        const googleContacts = connections
            .map(person => ({
                name: person.names?.[0]?.displayName || 'No Name',
                email: person.emailAddresses?.[0]?.value || '',
                phone: person.phoneNumbers?.[0]?.value ? person.phoneNumbers[0].value : ''
            }))
            .filter(c => c.phone); // must have phone

        const added = [];
        const skipped = [];

        for (const g of googleContacts) {
            const normalizedPhone = g.phone.replace(/\D/g, '');

            const existing = await Contact.findOne({
                userId: req.userId,
                phoneNormalized: normalizedPhone
            });

            if (existing) {
                skipped.push({ ...g, reason: 'Phone already exists' });
                continue;
            }

            const contact = new Contact({
                name: g.name,
                phone: g.phone,
                phoneNormalized: normalizedPhone,
                email: g.email,
                avatar: '',
                initial: g.name ? g.name.charAt(0).toUpperCase() : '',
                userId: req.userId,
                type: g.type || 'personal',
                location: g.address ? {
                    type: 'Point',
                    coordinates: [g.address.lng, g.address.lat]  // you need to geocode address first
                } : undefined
            });


            try {
                await contact.save();
                added.push(contact);
            } catch (err) {
                skipped.push({ ...g, reason: err.message });
            }
        }

        res.json({
            success: true,
            addedCount: added.length,
            skippedCount: skipped.length,
            added,
            skipped
        });

    } catch (err) {
        console.error('Google import error:', err);
        res.status(500).json({ error: err.message });
    }
});


// Bulk import contacts (array of contacts in body)
app.post('/api/contacts/bulk', verifyUser, async (req, res) => {
    try {
        const contacts = Array.isArray(req.body.contacts) ? req.body.contacts : [];
        if (contacts.length === 0) return res.status(400).json({ message: 'No contacts provided' });

        const results = { added: [], skipped: [] };

        for (const c of contacts) {
            if (!c.phone || !c.name) {
                results.skipped.push({ contact: c, reason: 'missing name or phone' });
                continue;
            }

            const normalizedPhone = String(c.phone).replace(/\D/g, '');

            // skip if phone exists for this user
            const exists = await Contact.findOne({
                userId: req.userId,
                phoneNormalized: normalizedPhone
            });

            if (exists) {
                results.skipped.push({ contact: c, reason: 'phone exists' });
                continue;
            }

            try {
                const newContact = new Contact({
                    name: c.name,
                    phone: c.phone,
                    phoneNormalized: String(c.phone).replace(/\D/g, ''),
                    email: c.email || '',
                    avatar: c.avatar || '',
                    initial: c.initial || (c.name ? c.name.charAt(0).toUpperCase() : ''),
                    userId: req.userId,
                    type: c.type || 'personal',
                    location: c.location ? {
                        type: 'Point',
                        coordinates: [c.location.lng, c.location.lat]
                    } : undefined
                });

                await newContact.save();
                results.added.push(newContact);
            } catch (err) {
                results.skipped.push({ contact: c, reason: err.message });
            }
        }

        res.json({ success: true, addedCount: results.added.length, skippedCount: results.skipped.length, ...results });
    } catch (err) {
        console.error('Bulk import error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});


//Fetch Google Contacts
app.get('/api/google/contacts', verifyUser, async (req, res) => {
    try {
        if (!req.session.tokens)
            return res.status(401).json({ error: 'Not authenticated' });

        oauth2Client.setCredentials(req.session.tokens);

        const service = google.people({ version: 'v1', auth: oauth2Client });

        const result = await service.people.connections.list({
            resourceName: 'people/me',
            pageSize: 200,
            personFields: 'names,emailAddresses,phoneNumbers',
        });

        const formattedContacts = (result.data.connections || []).map(person => ({
            name: person.names?.[0]?.displayName,
            email: person.emailAddresses?.[0]?.value,
            phone: person.phoneNumbers?.[0]?.value,
        }));

        res.json(formattedContacts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', verifyUser, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Optional: make sure the logged-in user is updating their own profile
        if (req.userId !== req.params.id) {
            return res.status(403).json({ message: 'Forbidden: cannot update another user' });
        }

        // Build update object
        const updateData = { username, email };
        if (password) {
            // If you have hashing middleware, just assign password
            updateData.password = password;
        }

        // Update in one step
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true } // return updated document
        );

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
            }
        });

    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});



const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});