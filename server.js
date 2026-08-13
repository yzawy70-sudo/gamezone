const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const orders = [];

// استقبال طلب شحن تجريبي
app.post("/api/order", (req, res) => {
    const { game, packageName, email, challengeCode } = req.body;

    if (!game || !packageName || !email || !challengeCode) {
        return res.status(400).json({
            success: false,
            message: "البيانات غير مكتملة"
        });
    }

    const order = {
        id: Date.now(),
        game: String(game).slice(0, 80),
        packageName: String(packageName).slice(0, 80),
        email: String(email).slice(0, 150),

        // رمز تجربة للمسابقة فقط
        challengeCode: String(challengeCode).slice(0, 80),

        status: "new",
        createdAt: new Date().toISOString()
    };

    orders.unshift(order);

    // إرسال الطلب مباشرة إلى لوحة الإدارة
    io.emit("newOrder", order);

    res.json({
        success: true,
        message: "تم استلام الطلب",
        orderId: order.id
    });
});

// جلب الطلبات
app.get("/api/orders", (req, res) => {
    res.json(orders);
});

// تغيير حالة طلب
app.post("/api/orders/:id/status", (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    const allowed = ["new", "processing", "completed"];

    if (!allowed.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "حالة غير صالحة"
        });
    }

    const order = orders.find(item => item.id === id);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: "الطلب غير موجود"
        });
    }

    order.status = status;

    io.emit("orderUpdated", order);

    res.json({
        success: true,
        order
    });
});

// حذف جميع الطلبات
app.delete("/api/orders", (req, res) => {
    orders.length = 0;

    io.emit("ordersCleared");

    res.json({
        success: true
    });
});

// لوحة الإدارة
app.get("/admin", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "admin.html")
    );
});

io.on("connection", socket => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

server.listen(PORT, () => {
    console.log("");
    console.log("================================");
    console.log("       GameZone Server");
    console.log("================================");
    console.log("");
    console.log(`Store: http://localhost:${PORT}`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
    console.log("");
});