/**
 * Direct Excel File Processor
 * Process your existing Excel files from student_list_excel folder
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs').promises;
const { StudentDatabase, StudentDataExtractor } = require('./main');

class ExcelProcessor {
  constructor() {
    // Create readline interface for user input
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  // Helper function to prompt user for input
  prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  async main() {
    console.log('='.repeat(70));
    console.log('🎓 STUDENT LIST EXCEL PROCESSOR');
    console.log('='.repeat(70));

    // Path for files in utils/uploaded_files/student_list_excel
    const excelFolder = path.join(__dirname, 'uploaded_files', 'student_list_excel');
    console.log(`\n📁 Excel folder: ${excelFolder}`); 
    // excelFolder → the directory path where Excel files are stored

    // Check if folder exists
    try {
      await fs.access(excelFolder);
    } catch {
      console.log('❌ Folder not found!');
      console.log('ℹ️  Creating folder...');
      await fs.mkdir(excelFolder, { recursive: true });
      console.log(`✅ Folder created: ${excelFolder}`); 
      // excelFolder → shows newly created folder path
      console.log('ℹ️  Place your Excel files there and run again');
      this.rl.close();
      return;
    }

    // Find Excel files
    let excelFiles = [];
    try {
      const files = await fs.readdir(excelFolder);
      excelFiles = files
        .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
        .map(file => path.join(excelFolder, file));
    } catch (error) {
      console.error(`❌ Error reading folder: ${error.message}`); 
      // error.message → reason why folder reading failed
      this.rl.close();
      return;
    }

    if (excelFiles.length === 0) {
      console.log('\n⚠️  No Excel files found in this folder');
      console.log('\nℹ️  Files in folder:');
      try {
        const allFiles = await fs.readdir(excelFolder);
        allFiles.forEach(file => {
          console.log(`   - ${file}`); 
          // file → lists each filename in folder
        });
      } catch (error) {
        console.log(`   Error: ${error.message}`); 
        // error.message → describes folder reading issue
      }
      this.rl.close();
      return;
    }

    console.log(`\n✅ Found ${excelFiles.length} Excel file(s):`); 
    // excelFiles.length → number of Excel files found

    for (let i = 0; i < excelFiles.length; i++) {
      const filePath = excelFiles[i];
      const fileName = path.basename(filePath);
      try {
        const stats = await fs.stat(filePath);
        const sizeKb = (stats.size / 1024).toFixed(1);
        console.log(`   ${i + 1}. ${fileName} (${sizeKb} KB)`); 
        // i → index of file in the list
        // fileName → name of the Excel file
        // sizeKb → size of the file in kilobytes
      } catch (error) {
        console.log(`   ${i + 1}. ${fileName} (size unknown)`); 
        // fileName → name shown even if file size failed to load
      }
    }

    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    let db;
    try {
      db = new StudentDatabase();
      await db.connect();
      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      console.error(`❌ MongoDB connection failed: ${error.message}`); 
      // error.message → reason for MongoDB connection failure
      console.log('\n💡 Make sure MongoDB is running:');
      console.log('   net start MongoDB');
      this.rl.close();
      return;
    }

    // Show current stats
    let stats = await db.getStatistics();
    console.log('\n📊 Current Database:');
    console.log(`   Total Students: ${stats.total_students}`); 
    // stats.total_students → total count of students in database
    console.log(`   Pending Media: ${stats.pending_media}`); 
    // stats.pending_media → number of students missing media files

    // Ask to clear existing data
    if (stats.total_students > 0) {
      const clear = await this.prompt(
        `\n⚠️  Found ${stats.total_students} existing students. Clear them first? (yes/no): `
      );
      if (clear.trim().toLowerCase() === 'yes') {
        await db.clearAllData();
        console.log('✅ Existing data cleared');
      }
    }

    // Process confirmation
    console.log('\n' + '='.repeat(70));
    const confirm = await this.prompt(
      `🚀 Process all ${excelFiles.length} file(s)? (yes/no): `
    );
    // excelFiles.length → total number of files to be processed

    if (confirm.trim().toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      await db.close();
      this.rl.close();
      return;
    }

    // Process each file
    console.log('\n' + '='.repeat(70));
    console.log('📄 PROCESSING FILES...');
    console.log('='.repeat(70));

    let totalProcessed = 0; // total number of files successfully processed
    let totalStudents = 0;  // total number of students added

    for (let i = 0; i < excelFiles.length; i++) {
      const excelFile = excelFiles[i];
      const fileName = path.basename(excelFile);

      console.log(`\n[${i + 1}/${excelFiles.length}] 📄 Processing: ${fileName}`); 
      // i + 1 → current file index
      // excelFiles.length → total files count
      // fileName → name of the current file
      console.log('-'.repeat(70));

      try {
        // Get student count before
        const beforeStats = await db.getStatistics();
        const beforeCount = beforeStats.total_students;

        // Process file
        const success = await StudentDataExtractor.processExcel(excelFile, db);

        // Get student count after
        const afterStats = await db.getStatistics();
        const afterCount = afterStats.total_students;
        const studentsAdded = afterCount - beforeCount;

        if (success && studentsAdded > 0) {
          console.log(`✅ Success! Added ${studentsAdded} students`); 
          // studentsAdded → number of new students from this file
          totalProcessed++;
          totalStudents += studentsAdded;
        } else if (success) {
          console.log('⚠️  File processed but no students added');
        } else {
          console.log('❌ Failed to process file');
        }

      } catch (error) {
        console.error(`❌ Error: ${error.message}`); 
        // error.message → reason for failure
        console.log('\nDetailed error:');
        console.error(error.stack); 
        // error.stack → full error trace
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ PROCESSING COMPLETE!');
    console.log('='.repeat(70));
    console.log(`Files processed: ${totalProcessed}/${excelFiles.length}`); 
    // totalProcessed → successfully processed files
    // excelFiles.length → total number of files
    console.log(`Total students added: ${totalStudents}`); 
    // totalStudents → number of new student records added

    // Show final stats
    const finalStats = await db.getStatistics();
    console.log('\n📊 Final Database Statistics:');
    console.log(`   Total Students: ${finalStats.total_students}`); 
    // finalStats.total_students → final total in database
    console.log(`   Pending Media: ${finalStats.pending_media}`); 
    // finalStats.pending_media → number needing media files
    console.log(`   Average Completion: ${finalStats.average_completion.toFixed(1)}%`); 
    // finalStats.average_completion → average data completeness

    if (Object.keys(finalStats.by_department).length > 0) {
      console.log('\n📚 Students by Department:');
      
      const deptNames = {
        'CCS': 'Computer Studies',
        'CHTM': 'Hospitality & Tourism',
        'CBA': 'Business Administration',
        'CTE': 'Teacher Education',
        'UNKNOWN': 'Unclassified'
      };

      Object.entries(finalStats.by_department).forEach(([dept, count]) => {
        const deptName = deptNames[dept] || dept;
        console.log(`   • ${deptName}: ${count} students`); 
        // deptName → department name
        // count → student count per department
      });
    }

    // Show pending media
    console.log('\n⏳ Students Waiting for Media:');
    const pending = await db.getPendingMediaStudents();
    if (pending.length > 0) {
      console.log(`   ${pending.length} students need image/audio uploads`); 
      // pending.length → total number of incomplete students

      const showList = await this.prompt('\n   Show list? (yes/no): ');
      if (showList.trim().toLowerCase() === 'yes') {
        const displayCount = Math.min(pending.length, 10);
        for (let i = 0; i < displayCount; i++) {
          const student = pending[i];
          console.log(`   - ${student.full_name || 'N/A'} (${student.student_id})`); 
          // student.full_name → student's full name
          // student.student_id → student ID number
        }
        if (pending.length > 10) {
          console.log(`   ... and ${pending.length - 10} more`); 
          // pending.length - 10 → number of remaining students not displayed
        }
      }
    } else {
      console.log('   None! (All students have complete media)');
    }

    await db.close();
    console.log('\n👋 Disconnected from MongoDB');
    console.log('='.repeat(70));

    this.rl.close();
  }

  async run() {
    try {
      await this.main();
    } catch (error) {
      console.error(`\n❌ Unexpected error: ${error.message}`); 
      // error.message → unexpected runtime error
      console.error(error.stack); 
      // error.stack → full error details
    } finally {
      await this.prompt('\nPress Enter to exit...');
      this.rl.close();
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Process interrupted by user');
  process.exit(0);
});

// Run if executed directly
if (require.main === module) {
  const processor = new ExcelProcessor();
  processor.run();
}

module.exports = ExcelProcessor;