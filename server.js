const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// ملفات التخزين
const USERS_FILE = './users.json';
const ORDERS_FILE = './orders.json';

// قراءة JSON
function readJSON(file){
    if(!fs.existsSync(file)) fs.writeFileSync(file,'[]');
    return JSON.parse(fs.readFileSync(file));
}

// كتابة JSON
function writeJSON(file,data){
    fs.writeFileSync(file, JSON.stringify(data,null,2));
}

// ================= USERS =================

// تسجيل
app.post('/api/register', async (req,res)=>{
    const {username,email,password} = req.body;

    const users = readJSON(USERS_FILE);

    if(users.find(u=>u.email===email)){
        return res.json({success:false,message:'البريد مستخدم'});
    }

    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if(!strong.test(password)){
        return res.json({success:false,message:'كلمة المرور ضعيفة'});
    }

    const hash = await bcrypt.hash(password,10);

    users.push({username,email,password:hash});
    writeJSON(USERS_FILE,users);

    res.json({success:true,message:'تم إنشاء الحساب'});
});

// تسجيل دخول
app.post('/api/login', async (req,res)=>{
    const {email,password} = req.body;
    const users = readJSON(USERS_FILE);

    const user = users.find(u=>u.email===email);
    if(!user) return res.json({success:false,message:'خطأ'});

    const match = await bcrypt.compare(password,user.password);
    if(!match) return res.json({success:false,message:'خطأ'});

    res.json({success:true,user:{username:user.username,email:user.email}});
});

// ================= ORDERS =================

// حفظ طلب
app.post('/api/orders',(req,res)=>{
    const orders = readJSON(ORDERS_FILE);
    const order = req.body;

    order.date = new Date().toLocaleString();

    orders.push(order);
    writeJSON(ORDERS_FILE,orders);

    console.log("📦 طلب:",order);

    res.json({success:true});
});

// جلب الطلبات
app.get('/api/orders',(req,res)=>{
    res.json(readJSON(ORDERS_FILE));
});

app.delete('/api/orders',(req,res)=>{
    writeJSON(ORDERS_FILE,[]);
    res.json({success:true});
});

app.listen(3000,()=>console.log('🚀 http://localhost:3000'));