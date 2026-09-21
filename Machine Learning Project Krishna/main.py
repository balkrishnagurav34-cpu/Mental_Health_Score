import joblib 
from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd 
model=joblib.load('Mentel_Health_Model.pkl')


app=FastAPI()

class StudentData(BaseModel):
    Age                 :int
    Gender              :str
    Country              :str    
    Academic_Level        : str  
    Most_Used_Platform    : str
    Purpose_Of_Use:str 
    Avg_Daily_Usage_Hours:float     
    Daily_Unlocks           :int  
    Study_Hours              :float
    Physical_Activity_Hours :float
    Sleep_Hours_Per_Night    :float 
    Stress_Level             :str

@app.get('/')

def greet(): 
    return{"Welcome to Krishna Home "}

@app.post('/predict')
def predict(data: StudentData): 
    input_row=pd.DataFrame([{
        'Age':data.age,
 'Gender':data.gender,
 'Country':data.country,
 'Academic_Level':data.academic_level,
 'Most_Used_Platform':data.most_used_platfrom,
 'Purpose_Of_Use':data.purpose_of_use,
 'Avg_Daily_Usage_Hours':data.avg_daily_usage_hours,
 'Daily_Unlocks':data.daily_unlocks,
 'Study_Hours':data.study_hours,
 'Physical_Activity_Hours':data.physical_activity_hours,
 'Sleep_Hours_Per_Night':data.sleep_hours_per_night,
 'Stress_Level':data.stress_level,
 'Mental_Health_Score':data.mental_health_score,
 'Grouped_country':data.grouped_country
    }])