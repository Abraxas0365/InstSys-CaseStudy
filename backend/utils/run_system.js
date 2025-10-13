// runSystem.js
const readline = require('readline');
const path = require('path');
const fs = require('fs').promises;
const { StudentDatabase, StudentDataExtractor } = require('./main');

class SchoolInformationSystem {
  constructor(connectionString = null) {
    this.db = new StudentDatabase(connectionString);
    
    // Paths relative to utils folder
    this.basePath = path.join(__dirname, 'uploaded_files');
    this.studentExcelFolder = path.join(this.basePath, 'student_list_excel');
    this.processedFolder = path.join(this.basePath, 'processed');
    
    // Create readline interface for user input
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log(`📁 Looking for Excel files in: ${this.studentExcelFolder}`);
  }

  // Helper function to prompt user for input
  prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  async clearAllData() {
    try {
      const confirm = await this.prompt('⚠️  Clear ALL student data from MongoDB? (yes/no): ');
      
      if (confirm.trim().toLowerCase() === 'yes') {
        await this.db.clearAllData();
        console.log('✅ All data cleared from MongoDB');
      } else {
        console.log('❌ Operation cancelled');
      }
    } catch (error) {
      console.error(`❌ Error clearing data: ${error.message}`);
    }
  }

  async scanAndProcessFiles() {
    try {
      // Check if directory exists
      try {
        await fs.access(this.studentExcelFolder);
      } catch {
        console.log(`📁 Creating folder: ${this.studentExcelFolder}`);
        await fs.mkdir(this.studentExcelFolder, { recursive: true });
        console.log(`ℹ️  Place your Excel files in: ${this.studentExcelFolder}`);
        return false;
      }

      // Find all Excel files
      const files = await fs.readdir(this.studentExcelFolder);
      const excelFiles = files.filter(file => 
        file.endsWith('.xlsx') || file.endsWith('.xls')
      );

      if (excelFiles.length === 0) {
        console.log(`⚠️  No Excel files found in: ${this.studentExcelFolder}`);
        console.log(`ℹ️  Place your Excel files there and run again`);
        return false;
      }

      console.log(`\n📊 Found ${excelFiles.length} Excel file(s)`);
      let totalProcessed = 0;

      for (const excelFile of excelFiles) {
        const filePath = path.join(this.studentExcelFolder, excelFile);
        console.log(`\n📄 Processing: ${excelFile}`);
        
        try {
          const success = await StudentDataExtractor.processExcel(filePath, this.db);
          
          if (success) {
            console.log(`✅ Successfully processed: ${excelFile}`);
            totalProcessed++;
          } else {
            console.log(`⚠️  No data extracted from: ${excelFile}`);
          }
        } catch (error) {
          console.error(`❌ Error processing ${excelFile}: ${error.message}`);
        }
      }

      return totalProcessed > 0;

    } catch (error) {
      console.error(`❌ Error scanning files: ${error.message}`);
      return false;
    }
  }

  async showStatistics() {
    const stats = await this.db.getStatistics();

    console.log('\n' + '='.repeat(60));
    console.log('📊 SYSTEM STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total Students: ${stats.total_students}`);
    console.log(`Pending Media: ${stats.pending_media}`);
    console.log(`Average Completion: ${stats.average_completion.toFixed(1)}%`);

    if (Object.keys(stats.by_department).length > 0) {
      console.log('\nBy Department:');
      Object.entries(stats.by_department).forEach(([dept, count]) => {
        console.log(`  • ${dept}: ${count} students`);
      });
    }
  }

  async showPendingMedia() {
    const pending = await this.db.getPendingMediaStudents();

    if (pending.length === 0) {
      console.log('\n✅ No students waiting for media!');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`⏳ STUDENTS WAITING FOR MEDIA (${pending.length})`);
    console.log('='.repeat(60));

    pending.forEach((student, index) => {
      console.log(`\n${index + 1}. ${student.full_name || 'N/A'} (${student.student_id})`);
      console.log(`   Course: ${student.course} | Year: ${student.year} | Section: ${student.section}`);

      const waiting = [];
      if (student.waiting_for.image) waiting.push('📸 Image');
      if (student.waiting_for.audio) waiting.push('🎤 Audio');

      console.log(`   Waiting for: ${waiting.join(', ')}`);
    });
  }

  async searchStudents() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 STUDENT SEARCH');
    console.log('='.repeat(60));

    const query = (await this.prompt('\nEnter search query (name or ID): ')).trim();

    if (!query) {
      console.log('❌ Please enter a search query');
      return;
    }

    // Optional filters
    console.log('\nOptional filters (press Enter to skip):');
    const course = (await this.prompt('Course (e.g., BSCS): ')).trim().toUpperCase() || null;
    const year = (await this.prompt('Year (1-4): ')).trim() || null;
    const section = (await this.prompt('Section (A, B, C): ')).trim().toUpperCase() || null;

    const filters = {};
    if (course) filters.course = course;
    if (year) filters.year = year;
    if (section) filters.section = section;

    // Search
    const results = await this.db.searchStudents(query, filters);

    if (results.length === 0) {
      console.log('\n❌ No students found');
      return;
    }

    console.log(`\n✅ Found ${results.length} student(s):`);
    console.log('='.repeat(60));

    results.forEach((student, index) => {
      console.log(`\n${index + 1}. ${student.full_name || 'N/A'} (ID: ${student.student_id})`);
      console.log(`   Course: ${student.course} | Year: ${student.year} | Section: ${student.section}`);
      console.log(`   Department: ${student.department}`);
      console.log(`   Completion: ${student.completion_percentage.toFixed(1)}%`);

      // Show media status
      const imageStatus = student.image?.status || 'waiting';
      const audioStatus = student.audio?.status || 'waiting';
      console.log(`   Media: 📸 ${imageStatus} | 🎤 ${audioStatus}`);
    });
  }

  async manualEntry() {
    console.log('\n' + '='.repeat(60));
    console.log('✏️  MANUAL STUDENT ENTRY');
    console.log('='.repeat(60));

    console.log('\nEnter student information:');

    const studentData = {
      student_id: (await this.prompt('Student ID: ')).trim(),
      surname: this.titleCase((await this.prompt('Surname: ')).trim()),
      first_name: this.titleCase((await this.prompt('First Name: ')).trim()),
      course: (await this.prompt('Course (e.g., BSCS): ')).trim().toUpperCase(),
      section: (await this.prompt('Section: ')).trim().toUpperCase(),
      year: (await this.prompt('Year (1-4): ')).trim(),
      contact_number: (await this.prompt('Contact Number: ')).trim(),
      guardian_name: this.titleCase((await this.prompt('Guardian Name: ')).trim()),
      guardian_contact: (await this.prompt('Guardian Contact: ')).trim()
    };

    // Create full name
    if (studentData.surname && studentData.first_name) {
      studentData.full_name = `${studentData.surname}, ${studentData.first_name}`;
    }

    // Detect department
    if (studentData.course) {
      studentData.department = StudentDataExtractor.detectDepartment(studentData.course);
    }

    // Create record
    const result = await this.db.createStudentRecord(studentData, 'manual_input');

    if (result) {
      console.log(`\n✅ Student ${result} created successfully!`);
      console.log('ℹ️  This student is now waiting for image and audio uploads');
    } else {
      console.log('\n❌ Failed to create student record');
    }
  }

  titleCase(str) {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async mainMenu() {
    while (true) {
      console.log('\n' + '='.repeat(60));
      console.log('🎓 SCHOOL INFORMATION SYSTEM - MONGODB');
      console.log('='.repeat(60));
      console.log('\n1. Process Excel Files');
      console.log('2. Manual Student Entry');
      console.log('3. Search Students');
      console.log('4. Show Pending Media');
      console.log('5. Show Statistics');
      console.log('6. Clear All Data');
      console.log('7. Exit');

      const choice = (await this.prompt('\nSelect option (1-7): ')).trim();

      try {
        if (choice === '1') {
          await this.scanAndProcessFiles();
        } else if (choice === '2') {
          await this.manualEntry();
        } else if (choice === '3') {
          await this.searchStudents();
        } else if (choice === '4') {
          await this.showPendingMedia();
        } else if (choice === '5') {
          await this.showStatistics();
        } else if (choice === '6') {
          await this.clearAllData();
        } else if (choice === '7') {
          console.log('\n👋 Goodbye!');
          break;
        } else {
          console.log('\n❌ Invalid option. Please select 1-7');
        }

        if (choice !== '7') {
          await this.prompt('\nPress Enter to continue...');
        }

      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        await this.prompt('\nPress Enter to continue...');
      }
    }
  }

  async run() {
    console.log('🎓 Starting School Information System...');
    console.log('='.repeat(60));

    try {
      // Connect to database
      await this.db.connect();

      // Show initial stats
      await this.showStatistics();

      // Start main menu
      await this.mainMenu();

    } catch (error) {
      console.error(`\n❌ System error: ${error.message}`);
    } finally {
      await this.db.close();
      this.rl.close();
      console.log('👋 Disconnected from MongoDB');
    }
  }
}

async function main() {
  try {
    // You can change connection string here
    // For local MongoDB:
    const system = new SchoolInformationSystem();

    // For MongoDB Atlas:
    // const system = new SchoolInformationSystem('mongodb+srv://user:pass@cluster.mongodb.net/school_system');

    await system.run();

  } catch (error) {
    console.error(`❌ Failed to start system: ${error.message}`);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 System shutdown requested');
  process.exit(0);
});

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = SchoolInformationSystem;