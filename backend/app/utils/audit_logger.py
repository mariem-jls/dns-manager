import logging
import os
from logging.handlers import RotatingFileHandler

logger = logging.getLogger('audit')
if not logger.handlers:
    log_path = os.getenv('AUDIT_LOG_PATH', '/var/log/dynamix-audit.log')
    try:
        handler = RotatingFileHandler(log_path, maxBytes=5_000_000, backupCount=3)
    except PermissionError:
        handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s', datefmt='%Y-%m-%dT%H:%M:%S')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def log(actor: str, action: str, details: str = ''):
    logger.info(f"actor={actor} action={action} details={details}")
