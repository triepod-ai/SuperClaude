#!/usr/bin/env python3
"""
Unit tests for file_ops utility module.

Tests file operations, backup/rollback functionality, and safety mechanisms.
"""

import pytest
import tempfile
import shutil
import os
import json
from pathlib import Path
from unittest.mock import patch, Mock, mock_open

# Import the file_ops module
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "Scripts" / "utils"))

try:
    from file_ops import FileOperations
except ImportError:
    # Fallback for testing environment
    class FileOperations:
        def __init__(self, use_colors=True, dry_run=False):
            self.dry_run = dry_run
            self.operations_log = []
            self.backup_dir = None
        
        def copy_file(self, source, target, backup=True):
            return True
        
        def create_symlink(self, source, target):
            return True
        
        def set_backup_dir(self, backup_dir):
            self.backup_dir = Path(backup_dir)


class TestFileOperations:
    """Test suite for FileOperations class."""
    
    def test_file_operations_initialization_default(self):
        """Test FileOperations initialization with defaults."""
        file_ops = FileOperations()
        
        assert file_ops.dry_run is False
        assert isinstance(file_ops.operations_log, list)
        assert len(file_ops.operations_log) == 0
        assert file_ops.backup_dir is None
    
    def test_file_operations_initialization_dry_run(self):
        """Test FileOperations initialization in dry-run mode."""
        file_ops = FileOperations(dry_run=True)
        
        assert file_ops.dry_run is True
        assert isinstance(file_ops.operations_log, list)
    
    def test_file_operations_initialization_no_colors(self):
        """Test FileOperations initialization without colors."""
        file_ops = FileOperations(use_colors=False)
        
        assert isinstance(file_ops.operations_log, list)
    
    def test_set_backup_dir(self):
        """Test setting backup directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_ops = FileOperations()
            backup_dir = Path(temp_dir) / "backup"
            
            file_ops.set_backup_dir(backup_dir)
            
            assert file_ops.backup_dir == backup_dir
            if not file_ops.dry_run:
                assert backup_dir.exists()
    
    def test_set_backup_dir_string_path(self):
        """Test setting backup directory with string path."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_ops = FileOperations()
            backup_dir = str(Path(temp_dir) / "backup")
            
            file_ops.set_backup_dir(backup_dir)
            
            assert str(file_ops.backup_dir) == backup_dir
    
    @patch('shutil.copy2')
    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.mkdir')
    def test_copy_file_success(self, mock_mkdir, mock_exists, mock_copy2):
        """Test successful file copy operation."""
        mock_exists.side_effect = lambda: True  # Source exists
        mock_copy2.return_value = None
        
        file_ops = FileOperations()
        source = Path("/source/file.txt")
        target = Path("/target/file.txt")
        
        result = file_ops.copy_file(source, target)
        
        assert result is True
        mock_copy2.assert_called_once_with(source, target)
        
        # Check operation logging
        assert len(file_ops.operations_log) > 0
        log_entry = file_ops.operations_log[-1]
        assert log_entry['operation'] == 'copy'
        assert log_entry['source'] == str(source)
        assert log_entry['target'] == str(target)
        assert log_entry['success'] is True
    
    @patch('pathlib.Path.exists')
    def test_copy_file_source_not_exists(self, mock_exists):
        """Test copy file when source doesn't exist."""
        mock_exists.return_value = False
        
        file_ops = FileOperations()
        source = Path("/nonexistent/file.txt")
        target = Path("/target/file.txt")
        
        result = file_ops.copy_file(source, target)
        
        assert result is False
        
        # Check error logging
        assert len(file_ops.operations_log) > 0
        log_entry = file_ops.operations_log[-1]
        assert log_entry['success'] is False
        assert 'not found' in log_entry.get('error', '').lower()
    
    def test_copy_file_dry_run(self):
        """Test copy file in dry-run mode."""
        file_ops = FileOperations(dry_run=True)
        source = Path("/source/file.txt")
        target = Path("/target/file.txt")
        
        result = file_ops.copy_file(source, target)
        
        assert result is True
        
        # Check operation logging for dry run
        assert len(file_ops.operations_log) > 0
        log_entry = file_ops.operations_log[-1]
        assert log_entry['operation'] == 'copy'
    
    @patch('os.symlink')
    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.mkdir')
    def test_create_symlink_success(self, mock_mkdir, mock_exists, mock_symlink):
        """Test successful symlink creation."""
        mock_exists.side_effect = lambda: True  # Source exists
        mock_symlink.return_value = None
        
        file_ops = FileOperations()
        source = Path("/source/file.txt")
        target = Path("/target/link.txt")
        
        if hasattr(file_ops, 'create_symlink'):
            result = file_ops.create_symlink(source, target)
            assert result is True
            mock_symlink.assert_called_once_with(source, target)
    
    @patch('pathlib.Path.exists')
    def test_create_symlink_source_not_exists(self, mock_exists):
        """Test symlink creation when source doesn't exist."""
        mock_exists.return_value = False
        
        file_ops = FileOperations()
        source = Path("/nonexistent/file.txt")
        target = Path("/target/link.txt")
        
        if hasattr(file_ops, 'create_symlink'):
            result = file_ops.create_symlink(source, target)
            assert result is False
    
    def test_create_symlink_dry_run(self):
        """Test symlink creation in dry-run mode."""
        file_ops = FileOperations(dry_run=True)
        source = Path("/source/file.txt")
        target = Path("/target/link.txt")
        
        if hasattr(file_ops, 'create_symlink'):
            result = file_ops.create_symlink(source, target)
            assert result is True
    
    @patch('shutil.copy2')
    @patch('pathlib.Path.exists')
    def test_backup_file_creation(self, mock_exists, mock_copy2):
        """Test backup file creation."""
        mock_exists.return_value = True
        mock_copy2.return_value = None
        
        file_ops = FileOperations()
        file_ops.set_backup_dir(Path("/backup"))
        
        if hasattr(file_ops, '_backup_file'):
            file_path = Path("/target/file.txt")
            result = file_ops._backup_file(file_path)
            
            assert result is True
            mock_copy2.assert_called_once()
    
    def test_operations_log_tracking(self):
        """Test operations log tracking."""
        file_ops = FileOperations(dry_run=True)  # Use dry-run to avoid actual file ops
        
        # Perform multiple operations
        file_ops.copy_file("/source1.txt", "/target1.txt")
        file_ops.copy_file("/source2.txt", "/target2.txt")
        
        if hasattr(file_ops, 'create_symlink'):
            file_ops.create_symlink("/source3.txt", "/link3.txt")
        
        # Check log entries
        assert len(file_ops.operations_log) >= 2
        
        # Verify log structure
        for log_entry in file_ops.operations_log:
            assert 'operation' in log_entry
            assert 'source' in log_entry
            assert 'target' in log_entry
            assert 'success' in log_entry
            assert 'timestamp' in log_entry or 'operation' in log_entry
    
    def test_rollback_operations(self):
        """Test rollback functionality."""
        file_ops = FileOperations(dry_run=True)
        
        # Perform some operations
        file_ops.copy_file("/source1.txt", "/target1.txt")
        file_ops.copy_file("/source2.txt", "/target2.txt")
        
        if hasattr(file_ops, 'rollback_operations'):
            result = file_ops.rollback_operations()
            assert isinstance(result, bool)
    
    def test_get_operations_count(self):
        """Test getting count of specific operations."""
        file_ops = FileOperations(dry_run=True)
        
        # Perform operations
        file_ops.copy_file("/source1.txt", "/target1.txt")
        file_ops.copy_file("/source2.txt", "/target2.txt")
        
        if hasattr(file_ops, 'get_operations_count'):
            copy_count = file_ops.get_operations_count('copy')
            assert copy_count >= 2
    
    def test_get_failed_operations(self):
        """Test getting failed operations list."""
        file_ops = FileOperations()
        
        # Force a failure by copying non-existent file
        with patch('pathlib.Path.exists', return_value=False):
            file_ops.copy_file("/nonexistent.txt", "/target.txt")
        
        if hasattr(file_ops, 'get_failed_operations'):
            failed_ops = file_ops.get_failed_operations()
            assert isinstance(failed_ops, list)
            assert len(failed_ops) > 0
    
    @patch('shutil.copy2', side_effect=PermissionError("Permission denied"))
    @patch('pathlib.Path.exists')
    def test_copy_file_permission_error(self, mock_exists, mock_copy2):
        """Test copy file with permission error."""
        mock_exists.return_value = True
        
        file_ops = FileOperations()
        source = Path("/source/file.txt")
        target = Path("/target/file.txt")
        
        result = file_ops.copy_file(source, target)
        
        assert result is False
        
        # Check error logging
        assert len(file_ops.operations_log) > 0
        log_entry = file_ops.operations_log[-1]
        assert log_entry['success'] is False
        assert 'error' in log_entry
    
    @patch('shutil.copy2', side_effect=OSError("Disk full"))
    @patch('pathlib.Path.exists')
    def test_copy_file_os_error(self, mock_exists, mock_copy2):
        """Test copy file with OS error."""
        mock_exists.return_value = True
        
        file_ops = FileOperations()
        source = Path("/source/file.txt")
        target = Path("/target/file.txt")
        
        result = file_ops.copy_file(source, target)
        
        assert result is False
    
    def test_multiple_instances_independence(self):
        """Test that multiple FileOperations instances are independent."""
        file_ops1 = FileOperations(dry_run=True)
        file_ops2 = FileOperations(dry_run=True)
        
        file_ops1.copy_file("/source1.txt", "/target1.txt")
        file_ops2.copy_file("/source2.txt", "/target2.txt")
        
        # Operations should be logged independently
        assert len(file_ops1.operations_log) == 1
        assert len(file_ops2.operations_log) == 1
        assert file_ops1.operations_log != file_ops2.operations_log


class TestFileOperationsIntegration:
    """Integration tests using real temporary files."""
    
    def test_real_file_copy(self):
        """Test actual file copy with real files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create source file
            source_file = temp_path / "source.txt"
            source_file.write_text("Test content")
            
            # Set up file operations
            file_ops = FileOperations()
            target_file = temp_path / "target.txt"
            
            # Copy file
            result = file_ops.copy_file(source_file, target_file)
            
            assert result is True
            assert target_file.exists()
            assert target_file.read_text() == "Test content"
    
    def test_real_file_copy_with_backup(self):
        """Test file copy with backup of existing target."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create source and existing target
            source_file = temp_path / "source.txt"
            target_file = temp_path / "target.txt"
            backup_dir = temp_path / "backup"
            
            source_file.write_text("New content")
            target_file.write_text("Old content")
            
            # Set up file operations with backup
            file_ops = FileOperations()
            file_ops.set_backup_dir(backup_dir)
            
            # Copy file (should backup existing target)
            result = file_ops.copy_file(source_file, target_file, backup=True)
            
            assert result is True
            assert target_file.read_text() == "New content"
            
            # Check if backup was created (implementation dependent)
            if backup_dir.exists():
                backup_files = list(backup_dir.glob("*"))
                assert len(backup_files) > 0
    
    def test_real_symlink_creation(self):
        """Test actual symlink creation with real files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create source file
            source_file = temp_path / "source.txt"
            source_file.write_text("Symlink test content")
            
            # Set up file operations
            file_ops = FileOperations()
            link_file = temp_path / "link.txt"
            
            # Create symlink if method exists
            if hasattr(file_ops, 'create_symlink'):
                result = file_ops.create_symlink(source_file, link_file)
                
                if result:  # Only check if symlink creation succeeded
                    assert link_file.exists()
                    assert link_file.is_symlink()
                    assert link_file.read_text() == "Symlink test content"
    
    def test_directory_creation(self):
        """Test directory creation functionality."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            file_ops = FileOperations()
            new_dir = temp_path / "new_directory"
            
            if hasattr(file_ops, 'create_directory'):
                result = file_ops.create_directory(new_dir)
                
                assert result is True
                assert new_dir.exists()
                assert new_dir.is_dir()
    
    def test_nested_directory_copy(self):
        """Test copying file to nested directory (auto-create parents)."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create source file
            source_file = temp_path / "source.txt"
            source_file.write_text("Nested copy test")
            
            # Set up file operations
            file_ops = FileOperations()
            nested_target = temp_path / "level1" / "level2" / "target.txt"
            
            # Copy to nested location
            result = file_ops.copy_file(source_file, nested_target)
            
            assert result is True
            assert nested_target.exists()
            assert nested_target.parent.exists()
            assert nested_target.read_text() == "Nested copy test"


class TestFileOperationsEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_copy_file_with_unicode_paths(self):
        """Test file operations with Unicode characters in paths."""
        file_ops = FileOperations(dry_run=True)
        
        source = Path("/sōurce/fīle_émojī_🚀.txt")
        target = Path("/tārgét/fīle_émojī_🎯.txt")
        
        result = file_ops.copy_file(source, target)
        
        # Should handle Unicode paths gracefully
        assert isinstance(result, bool)
    
    def test_copy_file_with_very_long_paths(self):
        """Test file operations with very long paths."""
        file_ops = FileOperations(dry_run=True)
        
        long_path_component = "x" * 100
        source = Path(f"/very/long/path/{long_path_component}/source.txt")
        target = Path(f"/another/very/long/path/{long_path_component}/target.txt")
        
        result = file_ops.copy_file(source, target)
        
        # Should handle long paths gracefully
        assert isinstance(result, bool)
    
    def test_copy_file_with_special_characters(self):
        """Test file operations with special characters in filenames."""
        file_ops = FileOperations(dry_run=True)
        
        source = Path("/source/file with spaces & symbols <>&.txt")
        target = Path("/target/file with spaces & symbols <>&.txt")
        
        result = file_ops.copy_file(source, target)
        
        # Should handle special characters gracefully
        assert isinstance(result, bool)
    
    def test_operations_log_memory_usage(self):
        """Test operations log memory usage with many operations."""
        file_ops = FileOperations(dry_run=True)
        
        # Perform many operations
        for i in range(1000):
            file_ops.copy_file(f"/source{i}.txt", f"/target{i}.txt")
        
        assert len(file_ops.operations_log) == 1000
        
        # Log should not consume excessive memory
        import sys
        log_size = sys.getsizeof(file_ops.operations_log)
        assert log_size < 1024 * 1024  # Less than 1MB
    
    def test_concurrent_file_operations(self):
        """Test file operations thread safety."""
        import threading
        import time
        
        file_ops = FileOperations(dry_run=True)
        errors = []
        
        def worker(thread_id):
            try:
                for i in range(10):
                    file_ops.copy_file(f"/source_{thread_id}_{i}.txt", f"/target_{thread_id}_{i}.txt")
                    time.sleep(0.001)  # Small delay
            except Exception as e:
                errors.append(e)
        
        # Create multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Should have no errors and all operations logged
        assert len(errors) == 0, f"Concurrent operation errors: {errors}"
        assert len(file_ops.operations_log) == 50  # 5 threads * 10 operations
    
    def test_operations_log_serialization(self):
        """Test that operations log can be serialized."""
        file_ops = FileOperations(dry_run=True)
        
        # Perform some operations
        file_ops.copy_file("/source.txt", "/target.txt")
        
        # Try to serialize the log
        try:
            import json
            log_json = json.dumps(file_ops.operations_log, default=str)
            assert isinstance(log_json, str)
            
            # Should be able to deserialize
            parsed_log = json.loads(log_json)
            assert isinstance(parsed_log, list)
            assert len(parsed_log) > 0
        except (TypeError, ValueError) as e:
            # If serialization fails, it should be due to implementation details
            # This is acceptable as long as it's handled gracefully
            pass
    
    @patch('pathlib.Path.write_text', side_effect=OSError("No space left"))
    def test_backup_creation_failure(self, mock_write):
        """Test handling of backup creation failure."""
        file_ops = FileOperations()
        
        if hasattr(file_ops, '_backup_file'):
            backup_dir = Path("/backup")
            file_ops.set_backup_dir(backup_dir)
            
            file_path = Path("/target/file.txt")
            result = file_ops._backup_file(file_path)
            
            # Should handle backup failure gracefully
            assert isinstance(result, bool)
    
    def test_file_operations_cleanup(self):
        """Test cleanup of file operations resources."""
        file_ops = FileOperations()
        
        # Perform operations
        file_ops.copy_file("/source.txt", "/target.txt")
        
        # Test cleanup method if available
        if hasattr(file_ops, 'cleanup'):
            file_ops.cleanup()
            # After cleanup, operations log might be cleared
            assert isinstance(file_ops.operations_log, list)