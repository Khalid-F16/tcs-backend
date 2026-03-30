// ================= IMPORTS =================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 سر التوكن
const SECRET = "TCS_SECRET_123";

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log("✅ MongoDB connected"))
.catch(err=> console.log(err));

// ================= MODELS =================

// 👤 المستخدم
const userSchema = new mongoose.Schema({
    username:String,
    email:String,
    password:String,
    role:{type:String, default:"user"}
});
const User = mongoose.model('User', userSchema);

// 📦 الطلبات
const orderSchema = new mongoose.Schema({
    username:String,
    email:String,
    productName:String,
    price:Number,
    paymentId:String,
    date:String
});
const Order = mongoose.model('Order', orderSchema);

// 🛒 المنتجات
const productSchema = new mongoose.Schema({
    name:String,
    price:Number,
    image:String,
    description:String,
    stock:Number
});
const Product = mongoose.model('Product', productSchema);

// ================= MIDDLEWARE =================

// 🔐 تحقق تسجيل الدخول
function auth(req,res,next){
    const token = req.headers.authorization;
    if(!token) return res.status(401).json({message:"Not logged in"});

    try{
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    }catch{
        res.status(401).json({message:"Invalid token"});
    }
}

// 👑 تحقق أدمن
function admin(req,res,next){
    if(req.user.role !== "admin"){
        return res.status(403).json({message:"Not admin"});
    }
    next();
}

// ================= ROUTES =================

// الصفحة الرئيسية
app.get('/', (req,res)=>{
    res.send('Backend is working ✅');
});

// ================= AUTH =================

// تسجيل
app.post('/api/register', async (req,res)=>{
    const {username,email,password} = req.body;

    const exist = await User.findOne({email});
    if(exist){
        return res.json({success:false,message:'البريد مستخدم'});
    }

    const hash = await bcrypt.hash(password,10);

    await User.create({
        username,
        email,
        password:hash
    });

    res.json({success:true,message:'تم إنشاء الحساب'});
});

// تسجيل دخول
app.post('/api/login', async (req,res)=>{
    const {email,password} = req.body;

    const user = await User.findOne({email});
    if(!user) return res.json({success:false});

    const match = await bcrypt.compare(password,user.password);
    if(!match) return res.json({success:false});

    const token = jwt.sign({
        id:user._id,
        email:user.email,
        role:user.role
    }, SECRET);

    res.json({
        success:true,
        token,
        user:{
            username:user.username,
            email:user.email,
            role:user.role // 🔥 مهم
        }
    });
});

// ================= ORDERS =================

// إضافة طلب (محمي)
app.post('/api/orders', auth, async (req,res)=>{
    const order = req.body;
    order.date = new Date().toLocaleString();

    await Order.create(order);

    res.json({success:true});
});

// جلب الطلبات (أدمن فقط)
app.get('/api/orders', auth, admin, async (req,res)=>{
    const orders = await Order.find();
    res.json(orders);
});

// حذف الطلبات
app.delete('/api/orders', auth, admin, async (req,res)=>{
    await Order.deleteMany({});
    res.json({success:true});
});

// ================= PRODUCTS =================

// إضافة منتج (أدمن)
app.post('/api/products', auth, admin, async (req,res)=>{
    try{
        await Product.create(req.body);
        res.json({success:true});
    }catch(err){
        console.error(err);
        res.json({success:false});
    }
});

// جلب المنتجات
app.get('/api/products', async (req,res)=>{
    const products = await Product.find();
    res.json(products);
});

// حذف منتج
app.delete('/api/products/:id', auth, admin, async (req,res)=>{
    await Product.findByIdAndDelete(req.params.id);
    res.json({success:true});
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log('🚀 Server running on port ' + PORT);
});