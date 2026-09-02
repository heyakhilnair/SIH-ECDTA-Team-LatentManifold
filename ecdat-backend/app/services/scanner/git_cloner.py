import os
import shutil
import tempfile
from git import Repo
import urllib.parse

def validate_git_url(url: str) -> bool:
    """
    Validates that the provided URL is a valid HTTPS Git repository.
    """
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ['http', 'https']:
            return False
        if not parsed.netloc:
            return False
        return True
    except Exception:
        return False

def clone_repo(url: str, target_dir: str):
    """
    Clones a git repository into the target directory with depth=1 for speed.
    """
    if not validate_git_url(url):
        raise ValueError(f"Invalid Git URL: {url}")
        
    print(f"[GitCloner] Cloning {url} into {target_dir}...")
    try:
        # Depth 1 minimizes network transfer and disk usage
        Repo.clone_from(url, target_dir, depth=1)
        print(f"[GitCloner] Successfully cloned {url}")
    except Exception as e:
        print(f"[GitCloner] Failed to clone {url}: {e}")
        raise

def create_scan_workspace() -> str:
    """
    Creates a secure temporary directory for scanning.
    """
    return tempfile.mkdtemp(prefix="ecdat_scan_")

def cleanup_scan_workspace(target_dir: str):
    """
    Aggressively deletes the temporary scan workspace.
    """
    if os.path.exists(target_dir) and 'ecdat_scan_' in target_dir:
        print(f"[GitCloner] Cleaning up workspace {target_dir}")
        
        # On Windows, read-only files (like git objects) might cause rmtree to fail.
        def onerror(func, path, exc_info):
            import stat
            if not os.access(path, os.W_OK):
                os.chmod(path, stat.S_IWUSR)
                func(path)
            else:
                raise
                
        shutil.rmtree(target_dir, onerror=onerror)
