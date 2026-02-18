
import dataikuapi
import logging
from ..config import settings
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class DataikuService:
    def __init__(self):
        self.host = settings.DATAIKU_HOST
        self.api_key = settings.API_KEY
        self.project_key = settings.PROJECT_KEY
        self._client = None
        self._project = None

    @property
    def client(self):
        if not self._client:
            logger.info(f"Connecting to Dataiku at {self.host}")
            self._client = dataikuapi.DSSClient(self.host, self.api_key)
        return self._client

    @property
    def project(self):
        if not self._project:
            self._project = self.client.get_project(self.project_key)
        return self._project

    def get_dataset_rows(self, dataset_name: str, limit: int = None) -> List[Dict[str, Any]]:
        """Fetch rows from a Dataiku dataset as dictionaries."""
        try:
            dataset = self.project.get_dataset(dataset_name)
            
            # 1. Get Schema to map column names
            schema = dataset.get_schema()
            column_names = [col['name'] for col in schema['columns']]
            
            rows = []
            iterator = dataset.iter_rows()
            
            for i, row in enumerate(iterator):
                if limit and i >= limit:
                    break
                # Convert list to dict using zip
                rows.append(dict(zip(column_names, row)))
            
            logger.info(f"Fetched {len(rows)} rows from dataset {dataset_name}")
            return rows
        except Exception as e:
            logger.error(f"Failed to fetch dataset rows: {e}")
            raise

    def get_folder(self, folder_id: str):
        """Get a managed folder instance."""
        return self.project.get_managed_folder(folder_id)

    def upload_file_to_folder(self, folder_id: str, remote_filename: str, file_stream) -> Dict[str, Any]:
        """Upload a file to a managed folder."""
        try:
            folder = self.get_folder(folder_id)
            folder.put_file(remote_filename, file_stream)
            logger.info(f"Uploaded {remote_filename} to folder {folder_id}")
            return {"filename": remote_filename, "folder_id": folder_id}
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise

    def list_folder_files(self, folder_id: str) -> List[Dict[str, Any]]:
        """List files in a managed folder."""
        try:
            folder = self.get_folder(folder_id)
            return folder.list_contents()
        except Exception as e:
            logger.error(f"Failed to list files in folder {folder_id}: {e}")
            raise

    def read_file_from_folder(self, folder_id: str, filename: str) -> str:
        """Read text/csv file content from managed folder."""
        try:
            folder = self.get_folder(folder_id)
            stream = folder.get_file(filename)
            content = stream.content.decode('utf-8')
            return content
        except Exception as e:
            logger.error(f"Failed to read file {filename} from folder {folder_id}: {e}")
            raise
    
    def run_scenario(self, scenario_id: str) -> str:
        """Trigger a scenario run and return the run ID."""
        try:
            scenario = self.project.get_scenario(scenario_id)
            trigger_fire = scenario.run() # Async run
            run_id = trigger_fire.run_id
            logger.info(f"Triggered scenario {scenario_id}, run_id: {run_id}")
            return run_id
        except Exception as e:
            logger.error(f"Failed to run scenario {scenario_id}: {e}")
            raise

    def get_scenario_run_status(self, scenario_id: str, run_id: str) -> Dict[str, Any]:
        """Get the status of a specific scenario run."""
        try:
            scenario = self.project.get_scenario(scenario_id)
            run = scenario.get_run(run_id)
            info = run.get_info()
            return info
        except Exception as e:
            logger.error(f"Failed to get run status for {scenario_id}/{run_id}: {e}")
            raise

dataiku_service = DataikuService()
