import logging
from logging.handlers import RotatingFileHandler

logger = logging.getLogger('audit')
if not logger.handlers:
    handler = RotatingFileHandler('/var/log/dynamix-audit.log', maxBytes=5_000_000, backupCount=3)
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s', datefmt='%Y-%m-%dT%H:%M:%S')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def log(actor: str, action: str, details: str = ''):
    logger.info(f"actor={actor} action={action} details={details}")
