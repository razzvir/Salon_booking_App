const mongoose=require("mongoose")

mongoose.connect("mongodb://localhost:27017/LoginFormPractice")

.then(()=>{
    console.log('mongoose connected');
})
.catch((e)=>{
    console.log('failed');
})


const AppointmentSchema=new mongoose.Schema({

    email:{
        type:String,
        required:true
    },
    phno:{
        type:String,
        required:true
    },
    timeslot:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required:true
    },
    date:{
        type:String,
        required:true
    },
    message:{
        type:String,
        required:true
    },
    
})


const AppointmentCollection=new mongoose.model('AppointmentCollection',AppointmentSchema)

module.exports=AppointmentCollection