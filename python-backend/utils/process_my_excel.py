"""
Direct Excel File Processor
Process your existing Excel files from student_list_excel folder
"""

import os
from pathlib import Path
from main import StudentDatabase, StudentDataExtractor

def main():
    print("="*70)
    print("🎓 STUDENT LIST EXCEL PROCESSOR")
    print("="*70)
    
    # Your actual path
    excel_folder = r"C:\Users\vince pascua\Downloads\vscodes\mongo\MongoDB\backend\utils\uploaded_files\student_list_excel"
    
    print(f"\n📁 Excel folder: {excel_folder}")
    
    # Check if folder exists
    if not os.path.exists(excel_folder):
        print(f"❌ Folder not found!")
        print(f"ℹ️  Please check the path")
        return
    
    # Find Excel files
    excel_files = list(Path(excel_folder).glob("*.xlsx")) + \
                 list(Path(excel_folder).glob("*.xls"))
    
    if not excel_files:
        print(f"\n⚠️  No Excel files found in this folder")
        print(f"\nℹ️  Files in folder:")
        try:
            all_files = list(Path(excel_folder).iterdir())
            for file in all_files:
                print(f"   - {file.name}")
        except Exception as e:
            print(f"   Error: {e}")
        return
    
    print(f"\n✅ Found {len(excel_files)} Excel file(s):")
    for i, file in enumerate(excel_files, 1):
        size_kb = file.stat().st_size / 1024
        print(f"   {i}. {file.name} ({size_kb:.1f} KB)")
    
    # Connect to MongoDB
    print(f"\n🔌 Connecting to MongoDB...")
    try:
        db = StudentDatabase()
        print("✅ Connected to MongoDB successfully")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        print("\n💡 Make sure MongoDB is running:")
        print("   net start MongoDB")
        return
    
    # Show current stats
    stats = db.get_statistics()
    print(f"\n📊 Current Database:")
    print(f"   Total Students: {stats['total_students']}")
    print(f"   Pending Media: {stats['pending_media']}")
    
    # Ask to clear existing data
    if stats['total_students'] > 0:
        clear = input(f"\n⚠️  Found {stats['total_students']} existing students. Clear them first? (yes/no): ").strip().lower()
        if clear == 'yes':
            db.clear_all_data()
            print("✅ Existing data cleared")
    
    # Process confirmation
    print(f"\n{'='*70}")
    confirm = input(f"🚀 Process all {len(excel_files)} file(s)? (yes/no): ").strip().lower()
    
    if confirm != 'yes':
        print("❌ Operation cancelled")
        db.close()
        return
    
    # Process each file
    print(f"\n{'='*70}")
    print("🔄 PROCESSING FILES...")
    print('='*70)
    
    total_processed = 0
    total_students = 0
    
    for i, excel_file in enumerate(excel_files, 1):
        print(f"\n[{i}/{len(excel_files)}] 📄 Processing: {excel_file.name}")
        print("-"*70)
        
        try:
            # Get student count before
            before_count = db.get_statistics()['total_students']
            
            # Process file
            success = StudentDataExtractor.process_excel(str(excel_file), db)
            
            # Get student count after
            after_count = db.get_statistics()['total_students']
            students_added = after_count - before_count
            
            if success and students_added > 0:
                print(f"✅ Success! Added {students_added} students")
                total_processed += 1
                total_students += students_added
            elif success:
                print(f"⚠️  File processed but no students added")
            else:
                print(f"❌ Failed to process file")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            # Show detailed error for debugging
            import traceback
            print("\nDetailed error:")
            traceback.print_exc()
    
    # Final summary
    print(f"\n{'='*70}")
    print("✅ PROCESSING COMPLETE!")
    print('='*70)
    print(f"Files processed: {total_processed}/{len(excel_files)}")
    print(f"Total students added: {total_students}")
    
    # Show final stats
    final_stats = db.get_statistics()
    print(f"\n📊 Final Database Statistics:")
    print(f"   Total Students: {final_stats['total_students']}")
    print(f"   Pending Media: {final_stats['pending_media']}")
    print(f"   Average Completion: {final_stats['average_completion']:.1f}%")
    
    if final_stats['by_department']:
        print(f"\n📚 Students by Department:")
        for dept, count in final_stats['by_department'].items():
            dept_name = {
                'CCS': 'Computer Studies',
                'CHTM': 'Hospitality & Tourism',
                'CBA': 'Business Administration',
                'CTE': 'Teacher Education',
                'UNKNOWN': 'Unclassified'
            }.get(dept, dept)
            print(f"   • {dept_name}: {count} students")
    
    # Show pending media
    print(f"\n⏳ Students Waiting for Media:")
    pending = db.get_pending_media_students()
    if pending:
        print(f"   {len(pending)} students need image/audio uploads")
        
        show_list = input(f"\n   Show list? (yes/no): ").strip().lower()
        if show_list == 'yes':
            for student in pending[:10]:  # Show first 10
                print(f"   - {student.get('full_name', 'N/A')} ({student['student_id']})")
            if len(pending) > 10:
                print(f"   ... and {len(pending)-10} more")
    else:
        print("   None! (All students have complete media)")
    
    db.close()
    print(f"\n👋 Disconnected from MongoDB")
    print("="*70)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Process interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
    
    input("\nPress Enter to exit...")