import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";

// ======== Setup Encryption ========

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __outdirname = path.dirname(__dirname);

const KEY_FILE = path.join(__dirname, "fernet.key");
console.log(KEY_FILE);

// Generate or load encryption key
function getOrCreateKey() {
  if (fs.existsSync(KEY_FILE)) {
    return fs.readFileSync(KEY_FILE);
  } else {
    const key = crypto.randomBytes(32);
    fs.writeFileSync(KEY_FILE, key);
    return key;
  }
}

const secretKey = getOrCreateKey();

// AES-256 encryption/decryption
export function encryptData(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", secretKey, iv);
  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");
  return `${iv.toString("base64")}:${encrypted}`;
}

export function decryptData(token) {
  const [ivStr, encrypted] = token.split(":");
  const iv = Buffer.from(ivStr, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", secretKey, iv);
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ======== Database Path ========
const BASE_DIR = path.join(__outdirname);
const DB_FILE = path.join(BASE_DIR, "src/accounts/students.json");

// ======== File I/O Helpers ========
export function loadStudents() {
    // console.log("Loading students from DB_FILE:", DB_FILE);
  if (!fs.existsSync(DB_FILE)) return {};
  const data = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(data);
}

export function saveStudents(students) {
  fs.writeFileSync(DB_FILE, JSON.stringify(students, null, 2), "utf-8");
}

// ======== RBAC Core ========
export function getRoleFromCourse(course) {
  const courseRoles = {
    "Bachelor of Science in Computer Science (BSCS)": "student CS",
    "Bachelor of Science in Information Technology (BSIT)": "student IT",
    "Bachelor of Science in Hospitality Management (BSHM)": "student HM",
    "Bachelor of Science in Tourism Management (BSTM)": "student TM",
    "Bachelor of Science in Office Administration (BSOAd)": "student OAd",
    "Bachelor of Early Childhood Education (BECEd)": "student ECEd",
    "Bachelor of Technology in Livelihood Education (BTLEd)": "student TLEd",
  };
  return courseRoles[course] || "student";
}

// ======== Account Creation ========
export function createStudentAccount(
  studentId,
  firstName,
  middleName,
  lastName,
  year,
  course,
  password,
  email,
  role = null
) {
  const students = loadStudents();

  if (students[studentId]) {
    return { error: "Student ID already exists" };
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const encryptedName = encryptData(`${firstName} ${middleName} ${lastName}`);
  const encryptedYear = encryptData(year);
  const encryptedCourse = encryptData(course);
  const encryptedEmail = encryptData(email);

  const assignedRole = role || getRoleFromCourse(course);

  students[studentId] = {
    studentName: encryptedName,
    year: encryptedYear,
    course: encryptedCourse,
    email: encryptedEmail,
    password: hashedPassword,
    role: assignedRole,
  };

  saveStudents(students);

  return {
    message: "Student account created successfully",
    studentId,
    role: assignedRole,
  };
}

// ======== Password Verification ========
export function verifyPassword(studentId, password) {
  const students = loadStudents();
  if (!students[studentId]) return false;
  return bcrypt.compareSync(password, students[studentId].password);
}

// ======== Student Info ========
export function getStudentInfo(studentId) {
  const students = loadStudents();
  if (!students[studentId]) return { error: "Student not found" };

  const student = students[studentId];
  return {
    studentId,
    studentName: decryptData(student.studentName),
    year: decryptData(student.year),
    course: decryptData(student.course),
    role: student.role,
  };
}

// ======== Admin: Get All Students ========
export function getAllStudents(requestingUserId) {
  const students = loadStudents();

  if (!students[requestingUserId]) {
    return { error: "Requesting user not found" };
  }

  if (students[requestingUserId].role !== "admin") {
    return { error: "Unauthorized access" };
  }

  return Object.entries(students).map(([sid, data]) => ({
    studentId: sid,
    studentName: decryptData(data.studentName),
    year: decryptData(data.year),
    course: decryptData(data.course),
    role: data.role,
  }));
}

export function mapStudentRole(studentRole) {
  const roleMap = {
    "student CS": ("teaching_faculty", ["BSCS"]),
    "student IT": ("teaching_faculty", ["BSIT"]),
    "student HM": ("teaching_faculty", ["BSHM"]),
    "student TM": ("teaching_faculty", ["BSTM"]),
    "student OAd": ("teaching_faculty", ["BSOAd"]),
    "student ECED": ("teaching_faculty", ["BECEd"]),
    "student TLEd": ("teaching_faculty", ["BTLEd"]),
    "faculty": ("Faculty", ["Faculty"]),
    "Guest": ("Guest", ["Guest"]),
    "student": ("Student", []), //fallback
  }
    return roleMap[studentRole] || { role: "student", assign: [""] };
};