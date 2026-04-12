import dotenv from "dotenv";
import connectDB from "../src/common/config/db.js";
import User from "../src/common/models/User.js";
import Hotel from "../src/modules/certification/application/models/Hotel.js";

dotenv.config();
await connectDB();

const hotelCounts = await Hotel.aggregate([
    { $group: { _id: "$ownerUserId", hotels: { $sum: 1 } } },
    { $sort: { hotels: -1 } },
]);

const users = await User.find({}, "_id email role name").lean();
const userById = new Map(users.map((u) => [String(u._id), u]));

const rows = hotelCounts.map((row) => {
    const id = row._id ? String(row._id) : null;
    const user = id ? userById.get(id) : null;
    return {
        ownerUserId: id,
        hotels: row.hotels,
        email: user?.email || null,
        role: user?.role || null,
        name: user?.name || null,
    };
});

console.log(JSON.stringify(rows, null, 2));
process.exit(0);
