const API="https://tcs-backend-oxa4.onrender.com";

// NAV
function showTab(tab){
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
}

// ================= STATS =================
async function loadStats(){
    const res = await fetch(API+'/api/dashboard',{
        headers:{'Authorization':localStorage.getItem('token')}
    });

    const data = await res.json();

    usersCount.innerText=data.users;
    ordersCount.innerText=data.orders;
    revenue.innerText=data.revenue || 0;
}

// ================= USERS =================
async function loadUsers(){
    const res = await fetch(API+'/api/users',{
        headers:{'Authorization':localStorage.getItem('token')}
    });

    const data = await res.json();

    usersList.innerHTML='';

    data.forEach(u=>{
        usersList.innerHTML+=`
        <div class="item">
            ${u.username} - ${u.email}
        </div>`;
    });
}

// ================= ORDERS =================
async function loadOrders(){
    const res = await fetch(API+'/api/orders',{
        headers:{'Authorization':localStorage.getItem('token')}
    });

    const data = await res.json();

    ordersList.innerHTML='';

    data.forEach(o=>{
        ordersList.innerHTML+=`
        <div class="item">
            ${o.user} - ${o.total}$ - ${o.date}
        </div>`;
    });
}

// ================= ADD PACKAGE =================
async function addPackage(){
    const form = new FormData();

    form.append("name",name.value);
    form.append("price",price.value);
    form.append("description",desc.value);
    form.append("category",category.value);
    form.append("image",fileInput.files[0]);

    await fetch(API+'/api/packages',{
        method:'POST',
        headers:{
            'Authorization':localStorage.getItem('token')
        },
        body:form
    });

    alert("تمت الإضافة 🔥");
}

// ================= AUTH =================
function logout(){
    localStorage.clear();
    location='index.html';
}

// ================= INIT =================
loadStats();
loadUsers();
loadOrders();