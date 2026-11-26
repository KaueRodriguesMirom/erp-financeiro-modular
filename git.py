cat << 'EOF' > push_github.py
import getpass
import os
import subprocess
import sys

USERNAME = "KaueRodriguesMirom"
REPO_URL = "https://github.com/KaueRodriguesMirom/erp-financeiro-modular.git"
CRED_FILE = os.path.expanduser("~/.git-credentials")


def run(cmd: list[str]) -> None:
    print(f"[EXEC] {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def main() -> None:
    if os.path.exists(CRED_FILE):
        os.remove(CRED_FILE)
        print("[OK] Credencial antiga removida.")

    token = getpass.getpass("Cole seu NOVO token do GitHub (ghp_... ou github_pat_...) e aperte Enter: ").strip()
    if not token:
        print("Erro: token vazio.")
        sys.exit(1)

    run(["git", "config", "--global", "credential.helper", "store"])

    with open(CRED_FILE, "w", encoding="utf-8") as f:
        f.write(f"https://{USERNAME}:{token}@github.com\n")
    os.chmod(CRED_FILE, 0o600)

    run(["git", "remote", "set-url", "origin", REPO_URL])
    run(["git", "branch", "-M", "main"])
    run(["git", "add", "."])

    status = subprocess.check_output(["git", "status", "--porcelain"], text=True).strip()
    if status:
        run(["git", "commit", "-m", "feat: estrutura inicial do ERP financeiro modular"])

    run(["git", "push", "-u", "origin", "main"])
    print("\n[SUCESSO] Projeto enviado para:", REPO_URL)


if __name__ == "__main__":
    main()
EOF
python3 push_github.py