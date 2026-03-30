require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');


const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const SECRET = "TCS_SECRET_123";

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log("✅ Mongo Connected"))
.catch(err=> console.log(err));

// ================= MODELS =================

// USERS
const User = mongoose.model('User', new mongoose.Schema({
    username:String,
    email:String,
    password:String,
    role:{type:String, default:"user"}
}));

// CATEGORIES
const Category = mongoose.model('Category', new mongoose.Schema({
    name:String,
    image:String
}));

// PACKAGES (مثل Tebex)
const Package = mongoose.model('Package', new mongoose.Schema({
    name:String,
    price:Number,
    image:String,
    description:String,
    category:String,
    commands:Array // فايف ام مستقبلاً
}));

// ORDERS
const Order = mongoose.model('Order', new mongoose.Schema({
    user:String,
    email:String,
    items:Array,
    total:Number,
    status:{type:String, default:"pending"},
    date:String
}));

// ================= UPLOAD =================
const storage = multer.diskStorage({
    destination:(req,file,cb)=> cb(null,'uploads'),
    filename:(req,file,cb)=> cb(null,Date.now()+path.extname(file.originalname))
});
const upload = multer({storage});

// ================= AUTH =================
function auth(req,res,next){
    const token = req.headers.authorization;
    if(!token) return res.status(401).json({});
    try{
        req.user = jwt.verify(token,SECRET);
        next();
    }catch{
        res.status(401).json({});
    }
}

function admin(req,res,next){
    if(req.user.role !== "admin") return res.status(403).json({});
    next();
}

// ================= AUTH =================
app.post('/api/register', async (req,res)=>{
    const {username,email,password} = req.body;
    const hash = await bcrypt.hash(password,10);
    await User.create({username,email,password:hash});
    res.json({success:true});
});

app.post('/api/login', async (req,res)=>{
    const {email,password} = req.body;
    const user = await User.findOne({email});
    if(!user) return res.json({success:false});

    const ok = await bcrypt.compare(password,user.password);
    if(!ok) return res.json({success:false});

    const token = jwt.sign({
        id:user._id,
        role:user.role
    },SECRET);

    res.json({
        success:true,
        token,
        user:{
            username:user.username,
            role:user.role
        }
    });
});

// ================= CATEGORIES =================
app.post('/api/categories', auth, admin, upload.single('image'), async (req,res)=>{
    await Category.create({
        name:req.body.name,
        image:'/uploads/'+req.file.filename
    });
    res.json({success:true});
});

app.get('/api/categories', async (req,res)=>{
    res.json(await Category.find());
});

// ================= PACKAGES =================
app.post('/api/packages', auth, admin, upload.single('image'), async (req,res)=>{
    await Package.create({
        name:req.body.name,
        price:req.body.price,
        description:req.body.description,
        category:req.body.category,
        image:'/uploads/'+req.file.filename,
        commands:[]
    });
    res.json({success:true});
});

app.get('/api/packages', async (req,res)=>{
    res.json(await Package.find());
});

// ================= ORDERS =================
app.post('/api/checkout', auth, async (req,res)=>{
    const order = req.body;
    order.date = new Date().toLocaleString();
    await Order.create(order);

    // هنا مستقبلاً:
    // send to discord
    // give item to FiveM

    res.json({success:true});
});

app.get('/api/orders', auth, admin, async (req,res)=>{
    res.json(await Order.find());
});

// ================= DASHBOARD =================
app.get('/api/dashboard', auth, admin, async (req,res)=>{
    const users = await User.countDocuments();
    const orders = await Order.countDocuments();
    res.json({users,orders});
});

app.get('/api/products', async (req,res)=>{
    try{

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;

        const skip = (page - 1) * limit;

        const products = await Product.find()
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments();

        res.json({
            products,
            total,
            page,
            pages: Math.ceil(total / limit)
        });

    }catch(err){
        console.error(err);
        res.json({success:false});
    }
});

// ================= SERVER =================
app.listen(3000,()=>console.log("🔥 Tebex System Ready"));