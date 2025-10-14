const mongoose = require('mongoose')
const url_1 = "mongodb://localhost:27017/accounts"
const url_2 = "mongodb://localhost:27017/file"
const userSchema = new mongoose.Schema({
  student_name: { type: String, required: true},
  year: { type: String, required: true},
  cousrse: { type: String, required: true},
  email: { type: String, required: true},
  password: { type: String, required: true},
  role: { type: String, required: true},
})

const fileSchema = new mongoose.Schema({

  file: {type: Blob, required:true},
  fileType: {type: String, required:true}

})

const User = mongoose.model('User', userSchema);
const File = mongoose.model('File', fileSchema);

async function connection() {

  try {

    await mongoose.connect(url_1, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log("Connection established.");

  } catch (error) {
    console.error("Connection Failed", error.message);
  }

}

async function register(userData) {
  try {
    const user = new User(userData);
    const savedUser = await user.save();

    console.log("User registered.")
    return savedUser;

  } catch (error) {
    console.error("Error registering user:", error.message)
  }
}

async function upload(userFile) {
  
  

}

module.exports = {connection};