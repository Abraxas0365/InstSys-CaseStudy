// studentDatabase.js
const { MongoClient } = require('mongodb');
const xlsx = require('xlsx');
const fs = require('fs').promises;
const path = require('path');

// Field Status Enum
const FieldStatus = {
  COMPLETE: 'complete',
  WAITING: 'waiting',
  MISSING: 'missing'
};

class StudentDatabase {
  constructor(connectionString = null, databaseName = 'school_system') {
    this.connectionString = connectionString || 'mongodb://localhost:27017/';
    this.databaseName = databaseName;
    this.client = null;
    this.db = null;
    this.students = null;
    this.pendingMedia = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(this.connectionString, {
        serverSelectionTimeoutMS: 5000
      });

      await this.client.connect();
      await this.client.db().admin().ping();
      console.log('✅ Connected to MongoDB successfully');

      this.db = this.client.db(this.databaseName);
      this.students = this.db.collection('students');
      this.pendingMedia = this.db.collection('pending_media');

      await this._createIndexes();
    } catch (error) {
      console.error(`❌ MongoDB Connection Error: ${error.message}`);
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Make sure MongoDB is running:');
      console.log('      - Windows: net start MongoDB');
      console.log('      - Or run: mongod --dbpath C:\\data\\db');
      console.log('   2. Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas');
      throw error;
    }
  }

  async _createIndexes() {
    await this.students.createIndex({ student_id: 1 }, { unique: true });
    await this.students.createIndex({ surname: 1 });
    await this.students.createIndex({ first_name: 1 });
    await this.students.createIndex({ course: 1 });
    await this.students.createIndex({ section: 1 });
    await this.students.createIndex({ year: 1 });
    await this.students.createIndex({ department: 1 });

    await this.pendingMedia.createIndex({ student_id: 1 });
    await this.pendingMedia.createIndex({ status: 1 });
  }

  async createStudentRecord(data, source = 'file_extraction') {
    try {
      const studentDoc = {
        student_id: data.student_id || '',
        surname: data.surname || '',
        first_name: data.first_name || '',
        full_name: data.full_name || '',
        course: data.course || '',
        section: data.section || '',
        year: data.year || '',
        contact_number: data.contact_number || '',
        guardian_name: data.guardian_name || '',
        guardian_contact: data.guardian_contact || '',
        department: data.department || '',

        image: {
          data: data.image_data || null,
          filename: data.image_filename || null,
          status: source === 'file_extraction' 
            ? FieldStatus.WAITING 
            : (data.image_data ? FieldStatus.COMPLETE : FieldStatus.WAITING)
        },
        audio: {
          data: data.audio_data || null,
          filename: data.audio_filename || null,
          status: source === 'file_extraction'
            ? FieldStatus.WAITING
            : (data.audio_data ? FieldStatus.COMPLETE : FieldStatus.WAITING)
        },

        field_status: this._determineFieldStatus(data, source),
        source: source,
        created_at: new Date(),
        updated_at: new Date(),
        completion_percentage: this._calculateCompletion(data, source)
      };

      const result = await this.students.updateOne(
        { student_id: studentDoc.student_id },
        { $set: studentDoc },
        { upsert: true }
      );

      if (studentDoc.image.status === FieldStatus.WAITING || 
          studentDoc.audio.status === FieldStatus.WAITING) {
        await this._addToPendingMedia(studentDoc);
      }

      console.log(`✅ Student record created/updated: ${studentDoc.student_id}`);
      return studentDoc.student_id;

    } catch (error) {
      console.error(`❌ Error creating student record: ${error.message}`);
      return null;
    }
  }

  _determineFieldStatus(data, source) {
    const fieldStatus = {};
    const textFields = ['student_id', 'surname', 'first_name', 'course', 'section', 'year'];

    textFields.forEach(field => {
      const value = data[field] || '';
      if (source === 'manual_input') {
        fieldStatus[field] = value ? FieldStatus.COMPLETE : FieldStatus.WAITING;
      } else {
        fieldStatus[field] = value ? FieldStatus.COMPLETE : FieldStatus.MISSING;
      }
    });

    fieldStatus.image = FieldStatus.WAITING;
    fieldStatus.audio = FieldStatus.WAITING;

    return fieldStatus;
  }

  _calculateCompletion(data, source) {
    const totalFields = 8;
    let completed = 0;

    const textFields = ['student_id', 'surname', 'first_name', 'course', 'section', 'year'];
    textFields.forEach(field => {
      if (data[field]) completed++;
    });

    if (data.image_data) completed++;
    if (data.audio_data) completed++;

    return (completed / totalFields) * 100;
  }

  async _addToPendingMedia(studentDoc) {
    const pendingDoc = {
      student_id: studentDoc.student_id,
      full_name: studentDoc.full_name,
      course: studentDoc.course,
      section: studentDoc.section,
      year: studentDoc.year,
      waiting_for: {
        image: studentDoc.image.status === FieldStatus.WAITING,
        audio: studentDoc.audio.status === FieldStatus.WAITING
      },
      added_at: new Date()
    };

    await this.pendingMedia.updateOne(
      { student_id: studentDoc.student_id },
      { $set: pendingDoc },
      { upsert: true }
    );
  }

  async updateMedia(studentId, mediaType, mediaData, filename) {
    try {
      const updateData = {
        [`${mediaType}.data`]: mediaData,
        [`${mediaType}.filename`]: filename,
        [`${mediaType}.status`]: FieldStatus.COMPLETE,
        [`field_status.${mediaType}`]: FieldStatus.COMPLETE,
        updated_at: new Date()
      };

      const result = await this.students.updateOne(
        { student_id: studentId },
        { $set: updateData }
      );

      if (result.modifiedCount > 0) {
        await this._updateCompletionPercentage(studentId);
        await this._checkPendingMediaComplete(studentId);
        console.log(`✅ Updated ${mediaType} for student ${studentId}`);
        return true;
      } else {
        console.log(`⚠️ Student ${studentId} not found`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Error updating media: ${error.message}`);
      return false;
    }
  }

  async _updateCompletionPercentage(studentId) {
    const student = await this.students.findOne({ student_id: studentId });
    if (!student) return;

    const totalFields = 8;
    let completed = 0;

    const textFields = ['student_id', 'surname', 'first_name', 'course', 'section', 'year'];
    textFields.forEach(field => {
      if (student[field]) completed++;
    });

    if (student.image?.status === FieldStatus.COMPLETE) completed++;
    if (student.audio?.status === FieldStatus.COMPLETE) completed++;

    const completion = (completed / totalFields) * 100;

    await this.students.updateOne(
      { student_id: studentId },
      { $set: { completion_percentage: completion } }
    );
  }

  async _checkPendingMediaComplete(studentId) {
    const student = await this.students.findOne({ student_id: studentId });
    if (!student) return;

    const imageComplete = student.image?.status === FieldStatus.COMPLETE;
    const audioComplete = student.audio?.status === FieldStatus.COMPLETE;

    if (imageComplete && audioComplete) {
      await this.pendingMedia.deleteOne({ student_id: studentId });
      console.log(`🎉 Student ${studentId} completed all media requirements`);
    }
  }

  async getPendingMediaStudents() {
    return await this.pendingMedia.find({}).toArray();
  }

  async searchStudents(query = null, filters = null) {
    const searchFilter = {};

    if (query) {
      searchFilter.$or = [
        { surname: { $regex: query, $options: 'i' } },
        { first_name: { $regex: query, $options: 'i' } },
        { full_name: { $regex: query, $options: 'i' } },
        { student_id: { $regex: query, $options: 'i' } }
      ];
    }

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (key === 'year') {
          searchFilter[key] = String(filters[key]);
        } else {
          searchFilter[key] = filters[key];
        }
      });
    }

    return await this.students.find(searchFilter).toArray();
  }

  async getStudentById(studentId) {
    return await this.students.findOne({ student_id: studentId });
  }

  async getStatistics() {
    const totalStudents = await this.students.countDocuments({});
    const pendingMedia = await this.pendingMedia.countDocuments({});

    const avgResult = await this.students.aggregate([
      {
        $group: {
          _id: null,
          avg_completion: { $avg: '$completion_percentage' }
        }
      }
    ]).toArray();

    const avgCompletion = avgResult.length > 0 ? avgResult[0].avg_completion : 0;

    const byDept = await this.students.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const byDepartment = {};
    byDept.forEach(dept => {
      byDepartment[dept._id] = dept.count;
    });

    return {
      total_students: totalStudents,
      pending_media: pendingMedia,
      average_completion: Math.round(avgCompletion * 100) / 100,
      by_department: byDepartment
    };
  }

  async viewAllStudents(limit = 50) {
    return await this.students.find({}).limit(limit).toArray();
  }

  async viewStudentDetails(studentId) {
    return await this.students.findOne({ student_id: studentId });
  }

  async exportToDict() {
    return {
      students: await this.students.find({}).toArray(),
      pending_media: await this.pendingMedia.find({}).toArray()
    };
  }

  async clearAllData() {
    await this.students.deleteMany({});
    await this.pendingMedia.deleteMany({});
    console.log('🗑️ All data cleared');
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

class StudentDataExtractor {
  static async processExcel(filePath, db) {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      const columnMapping = {
        'student id': 'student_id',
        'id no': 'student_id',
        'id': 'student_id',
        'full name': 'full_name',
        'name': 'full_name',
        'surname': 'surname',
        'first name': 'first_name',
        'year': 'year',
        'course': 'course',
        'section': 'section',
        'contact number': 'contact_number',
        'guardian name': 'guardian_name',
        'guardian contact': 'guardian_contact'
      };

      let processedCount = 0;

      for (const row of data) {
        const studentData = {};

        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key];
        });

        Object.keys(columnMapping).forEach(colHeader => {
          const dataKey = columnMapping[colHeader];
          if (normalizedRow[colHeader] !== undefined && normalizedRow[colHeader] !== null) {
            const rawValue = String(normalizedRow[colHeader]).trim();
            if (rawValue && !['nan', '', 'null'].includes(rawValue.toLowerCase())) {
              studentData[dataKey] = this.cleanValue(rawValue, dataKey);
            }
          }
        });

        if (studentData.course) {
          studentData.department = this.detectDepartment(studentData.course);
        }

        if (!studentData.full_name && studentData.surname && studentData.first_name) {
          studentData.full_name = `${studentData.surname}, ${studentData.first_name}`;
        }

        if (studentData.student_id || studentData.full_name) {
          const result = await db.createStudentRecord(studentData, 'file_extraction');
          if (result) processedCount++;
        }
      }

      console.log(`📊 Processed ${processedCount} students from Excel`);
      return processedCount > 0;

    } catch (error) {
      console.error(`❌ Error processing Excel: ${error.message}`);
      return false;
    }
  }

  static cleanValue(value, fieldType) {
    if (!value) return null;

    value = value.trim();

    if (fieldType === 'student_id') {
      return value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    } else if (['contact_number', 'guardian_contact'].includes(fieldType)) {
      const cleaned = value.replace(/[^\d+]/g, '');
      return (cleaned.length >= 7 && cleaned.length <= 15) ? cleaned : null;
    } else if (['full_name', 'guardian_name', 'surname', 'first_name'].includes(fieldType)) {
      return value.replace(/[^A-Za-z\s.,-]/g, '').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    } else if (fieldType === 'year') {
      const yearMatch = value.match(/([1-4])/);
      return yearMatch ? yearMatch[1] : null;
    } else if (['course', 'section'].includes(fieldType)) {
      return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    return value;
  }

  static detectDepartment(courseCode) {
    if (!courseCode) return 'UNKNOWN';

    const courseUpper = String(courseCode).toUpperCase().trim();

    const knownCourses = {
      'CCS': ['BSCS', 'BSIT'],
      'CHTM': ['BSHM', 'BSTM'],
      'CBA': ['BSBA', 'BSOA'],
      'CTE': ['BECED', 'BTLE']
    };

    for (const [dept, courses] of Object.entries(knownCourses)) {
      if (courses.includes(courseUpper)) {
        return dept;
      }
    }

    return 'UNKNOWN';
  }
}

module.exports = { StudentDatabase, StudentDataExtractor, FieldStatus };