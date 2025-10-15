const mongoose = require('mongoose')
const url_1 = "mongodb://localhost:27017/accounts"
const url_2 = "mongodb://localhost:27017/file"

const userSchema = new mongoose.Schema({
  student_name: { type: String, required: true},
  year: { type: String, required: true},
  course: { type: String, required: true},
  email: { type: String, required: true},
  password: { type: String, required: true},
  role: { type: String, required: true},
})
const fileSchema = new mongoose.Schema({

  file_name: {type: String, require:true},
  fileType: {type: String, required:true},
  file: {type: Buffer, required:true}

})

const User = mongoose.model('User', userSchema);
const File = mongoose.model('File', fileSchema);


const AccountsConnection = mongoose.createConnection(url_1, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
const FileConnection = mongoose.createConnection(url_1, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });


async function connection() {

  try {

      await Promise.all([
        AccountsConnection.asPromise(),
        FileConnection.asPromise(),
      ]);

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
  try {
    
    const file = new File(userFile);
    const saveFile = await file.save();
    console.log("File uploaded")
    return savedFile;

  } catch (error) {
    console.error("")
  }

}

module.exports = { connection, register, upload };