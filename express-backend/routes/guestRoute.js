import express from "express";
import fs from "fs";
import path from "path";
import { decryptData, loadStudents } from "../utils/helpers.js"; // adjust paths

const router = express.Router();

// 🔹 GET /student/:student_id
router.get("/student/:student_id", async (req, res) => {
  try {
    const studentId = req.params.student_id;
    const students = loadStudents();

    const student = students[studentId];
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Decrypt and split name
    const decryptedName = decryptData(student.studentName || "");
    const nameParts = decryptedName.split(" ");

    let firstName = "", middleName = "", lastName = "";
    if (nameParts.length >= 3) {
      firstName = nameParts[0];
      middleName = nameParts[1];
      lastName = nameParts.slice(2).join(" ");
    } else if (nameParts.length === 2) {
      firstName = nameParts[0];
      lastName = nameParts[1];
    } else {
      firstName = decryptedName;
    }

    const decryptedStudent = {
      studentId,
      firstName,
      middleName,
      lastName,
      email: decryptData(student.email || ""),
      year: decryptData(student.year || ""),
      course: decryptData(student.course || ""),
      role: student.role || "",
    };

    res.status(200).json(decryptedStudent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
