import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __outdirname = path.dirname(__dirname);

// ======== Database Path ========
const BASE_DIR = path.join(__outdirname);
const DB_FILE = path.join(BASE_DIR, "../express-backend/src/config/students.json");

// ======== File I/O Helpers ========
export function loadStudents() {
    // console.log("Loading students from DB_FILE:", DB_FILE);
  if (!fs.existsSync(DB_FILE)) {
    console.log("DB_FILE does not exist, returning empty object");
    return {}
  };
  const data = fs.readFileSync(DB_FILE, "utf-8");
  // console.log("Students data loaded:", data);
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
export function createStudentAccount({
  studentId,
  firstName,
  middleName,
  lastName,
  year,
  course,
  password,
  email,
  role = null
}) {
  console.log("Creating student account for ID:", studentId);
  const students = loadStudents();

  if (students[studentId]) {
    console.log("Student ID already exists");
    return { error: "Student ID already exists" };
  }

  const hashedPassword = password;
  const encryptedName = `${firstName} ${middleName} ${lastName}`;
  const encryptedYear = year;
  const encryptedCourse = course;
  const encryptedEmail = email;

  const assignedRole = role || getRoleFromCourse(course);

  students[studentId] = {
    studentName: encryptedName,
    year: encryptedYear,
    course: encryptedCourse,
    email: encryptedEmail,
    password: hashedPassword,
    role: assignedRole,
  };

  console.log("New student data:", students[studentId]);
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
  if (students[studentId].password === password) return true;
  
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