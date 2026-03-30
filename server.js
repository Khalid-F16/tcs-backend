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

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log("✅ Mongo Connected"))
.catch(err=> console.log(err));

// ================= MODELS =================
const User = mongoose.model('User', new mongoose.Schema({
    username:String,
    email:String,
    password:String,
    role:{type:String, default:"user"}
}));

const Product = mongoose.model('Product', new mongoose.Schema({
    name:String,
    price:Number,
    image:String,
    description:String,
    stock:Number
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    username:String,
    email:String,
    items:Array,
    total:Number,
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
    if(!token) return res.status(401).json({message:"unauthorized"});
    try{
        req.user = jwt.verify(token,SECRET);
        next();
    }catch{
        res.status(401).json({message:"invalid"});
    }
}

function admin(req,res,next){
    if(req.user.role !== "admin"){
        return res.status(403).json({message:"not admin"});
    }
    next();
}

// ================= ROUTES =================

// REGISTER
app.post('/api/register', async (req,res)=>{
    const {username,email,password} = req.body;

    const exist = await User.findOne({email});
    if(exist) return res.json({success:false,message:"مستخدم موجود"});

    const hash = await bcrypt.hash(password,10);

    await User.create({username,email,password:hash});

    res.json({success:true,message:"تم التسجيل"});
});

// LOGIN
app.post('/api/login', async (req,res)=>{
    const {email,password} = req.body;

    const user = await User.findOne({email});
    if(!user) return res.json({success:false});

    const match = await bcrypt.compare(password,user.password);
    if(!match) return res.json({success:false});

    const token = jwt.sign({
        id:user._id,
        role:user.role
    },SECRET);

    res.json({
        success:true,
        token,
        user:{
            username:user.username,
            email:user.email,
            role:user.role
        }
    });
});

// PRODUCTS
app.post('/api/products', auth, admin, upload.single('image'), async (req,res)=>{
    const product = {
        name:req.body.name,
        price:Number(req.body.price),
        description:req.body.description,
        stock:Number(req.body.stock),
        image:'/uploads/' + req.file.filename
    };

    await Product.create(product);
    res.json({success:true});
});

app.get('/api/products', async (req,res)=>{
    res.json(await Product.find());
});

// ORDERS
app.post('/api/orders', auth, async (req,res)=>{
    const order = req.body;
    order.date = new Date().toLocaleString();
    await Order.create(order);
    res.json({success:true});
});

// DASHBOARD
app.get('/api/dashboard', auth, admin, async (req,res)=>{
    const users = await User.countDocuments();
    const orders = await Order.countDocuments();
    const all = await Order.find();
    const revenue = all.reduce((a,b)=>a+b.total,0);

    res.json({users,orders,revenue});
});

app.get('/api/users', auth, admin, async (req,res)=>{
    res.json(await User.find({},'-password'));
});

app.get('/api/orders', auth, admin, async (req,res)=>{
    res.json(await Order.find());
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("🚀 Server Running"));