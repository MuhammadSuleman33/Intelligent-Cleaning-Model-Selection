from app.services.dataset_service import build_schema_preview
import pandas as pd

df = pd.DataFrame({'a': [1, 2]})
result = build_schema_preview(df)
print(result)