import dotenv from "dotenv";
import connectDB from "../src/common/config/db.js";
import Hotel from "../src/modules/certification/application/models/Hotel.js";
import HotelRequest from "../src/common/models/HotelRequest.js";
import Certificate from "../src/common/models/certificate.model.js";

dotenv.config();

await connectDB();

const [hotels, reqs, certs] = await Promise.all([
    Hotel.countDocuments({}),
    HotelRequest.countDocuments({}),
    Certificate.countDocuments({}),
]);

const reqBreak = await HotelRequest.aggregate([
    {
        $group: {
            _id: { h: "$hotelScore.status", a: "$auditScore.status" },
            count: { $sum: 1 },
        },
    },
    { $sort: { count: -1 } },
]);

const certBreak = await Certificate.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
]);

const owners = await Hotel.aggregate([
    { $group: { _id: "$ownerUserId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
]);

console.log("Totals:", { hotels, hotelRequests: reqs, certificates: certs });
console.log("HotelRequest breakdown:", reqBreak);
console.log("Certificates breakdown:", certBreak);
console.log("Top ownerUserId counts:", owners);
