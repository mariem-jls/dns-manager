import subprocess

def named_checkzone(name: str, path: str) -> tuple[bool,str]:
    try:
        out = subprocess.check_output(["named-checkzone", name, path], stderr=subprocess.STDOUT, text=True)
        return True, out
    except subprocess.CalledProcessError as e:
        return False, e.output
