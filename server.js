const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// 🟢 اتصال Mongo من ENV
mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log("✅ MongoDB connected"))
.catch(err=> console.log(err));

// ================= MODELS =================

// مستخدم
const userSchema = new mongoose.Schema({
    username:String,
    email:String,
    password:String
});

const User = mongoose.model('User', userSchema);

// طلب
const orderSchema = new mongoose.Schema({
    username:String,
    email:String,
    productName:String,
    price:Number,
    paymentId:String,
    date:String
});

const Order = mongoose.model('Order', orderSchema);

// ================= ROUTES =================

// الصفحة الرئيسية
app.get('/', (req,res)=>{
    res.send('Backend is working ✅');
});

// تسجيل
app.post('/api/register', async (req,res)=>{
    try{
        const {username,email,password} = req.body;

        const exist = await User.findOne({email});
        if(exist) return res.json({success:false,message:'البريد مستخدم'});

        const hash = await bcrypt.hash(password,10);

        await User.create({username,email,password:hash});

        res.json({success:true,message:'تم إنشاء الحساب'});
    }catch(err){
        res.json({success:false,message:'خطأ'});
    }
});

// تسجيل دخول
app.post('/api/login', async (req,res)=>{
    try{
        const {email,password} = req.body;

        const user = await User.findOne({email});
        if(!user) return res.json({success:false,message:'خطأ'});

        const match = await bcrypt.compare(password,user.password);
        if(!match) return res.json({success:false,message:'خطأ'});

        res.json({
            success:true,
            user:{
                username:user.username,
                email:user.email
            }
        });
    }catch{
        res.json({success:false});
    }
});

// حفظ طلب
app.post('/api/orders', async (req,res)=>{
    const order = req.body;
    order.date = new Date().toLocaleString();

    await Order.create(order);

    res.json({success:true});
});

// جلب الطلبات
app.get('/api/orders', async (req,res)=>{
    const orders = await Order.find();
    res.json(orders);
});

// حذف الطلبات
app.delete('/api/orders', async (req,res)=>{
    await Order.deleteMany({});
    res.json({success:true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('🚀 Server running'));