# Student Mental Health Score Prediction

> Predicting Student Mental Health Score from Social Media Usage.

## Overview <a name="overview"></a>

This project builds a machine learning model to predict students' mental health scores based on their social media habits and lifestyle factors. It uses a Kaggle dataset covering demographics, platform usage, and lifestyle attributes to train and evaluate regression models that estimate mental health score.


 **Live Demo:** [https://mental-health-score-predictor-2-j78e.onrender.com/](https://mental-health-score-predictor-2-j78e.onrender.com/)

---

## 📌 Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Dataset](#dataset)
- [Tools & Technologies](#tools--technologies)
- [Methods Used](#methods-used)
- [Key Insights](#key-insights)
- [Models](#models)
- [Results & Conclusion](#results--conclusion)
- [Author & Contact](#author--contact)

---

## Problem Statement <a name="problem-statement"></a>

The goal is to predict a student's mental health score — a continuous value ranging from 3 to 10 — based on their social media habits, study time, sleep, physical activity, and stress level.

---

## Dataset <a name="dataset"></a>

- **Source:** Kaggle
- **Size:** 5,000 students, 13 columns
- **Description:** Covers:
  - **Demographics:** age, gender, country
  - **Platform usage:** average daily usage hours, daily logins, most used platform
  - **Lifestyle:** study hours, sleep hours per night, physical activity hours, stress level

---

## Tools & Technologies <a name="tools--technologies"></a>

- **Language:** Python
- **Libraries:** NumPy, Pandas, Matplotlib, Seaborn, Scikit-learn
- **Backend:** FastAPI
- **Frontend:** HTML, CSS, JavaScript

---

## Methods Used <a name="methods-used"></a>

1. Imported required libraries
2. Loaded the dataset (Kaggle → notebook)
3. Explored the dataset
4. Performed Exploratory Data Analysis (EDA):
   - Distribution of the target variable
   - Correlation of features with the target column
   - Scatter plot of daily usage hours vs. mental health score
   - Checked for outliers
5. Data cleaning:
   - Removed duplicate values
   - Removed negative/unrealistic values
   - Checked skewness in columns
6. Feature engineering:
   - Reduced high-cardinality feature (country) to fewer meaningful categories to improve model performance
7. Encoding:
   - Applied label encoding and one-hot encoding depending on the use case
8. Train-test split
9. Preprocessing pipeline using `ColumnTransformer` (different treatment per column type)
10. Model building:
    - Linear Regression (base model)
    - Random Forest (default parameters)
    - Random Forest with hyperparameter tuning
11. Model evaluation using R² score, Mean Absolute Error (MAE), and Root Mean Squared Error (RMSE)
12. Saved the final model as a pickle file

---

## Key Insights <a name="key-insights"></a>

- During EDA, skewness was present in several columns, and not all columns were positively correlated with the target column.
- Outliers were present in some of the columns.
- The `country` column had high cardinality (110 unique values), which would make the model heavy and harder to train — so it was reduced to the top 10 most frequent countries, with all remaining values grouped into an "Others" category.
- Instead of deleting rows with negative/unrealistic values, those values were clipped to zero to preserve data.
- Different columns required different preprocessing: some needed ordinal encoding, some label encoding, some were left as plain numeric columns, and others went through a dedicated sub-pipeline — handled via a `ColumnTransformer`.
- Preprocessing was fit only on the training data (not on the test data), keeping the test set unseen so the model generalizes well and avoids overfitting.
- After hyperparameter tuning, the Random Forest model's R² score and MAE both got slightly worse compared to the default Random Forest — so the default (untuned) Random Forest was chosen as the final model.

---

## Models <a name="models"></a>

- **Base model:** Linear Regression
- **Improved model:** Random Forest Regressor (default parameters) — selected as the final model
- **Also tried:** Random Forest with hyperparameter tuning
- **Output:** Trained model saved as a `.pkl` (pickle) file for future inference
- **Deployment:** The saved model is integrated with the FastAPI backend. When a user submits their inputs on the frontend and clicks "Predict," the backend uses the Random Forest model to output a predicted mental health score in the range of 3 to 10.

---

## Results & Conclusion <a name="results--conclusion"></a>

| Model | R² Score | MAE |
|---|---|---|
| Linear Regression | 0.74 | 0.54 |
| Random Forest (default) | 0.88 | 0.35 |
| Random Forest (hyperparameter tuned) | 0.87 | 0.37 |

The Random Forest model (default parameters) achieved the best R² score and lowest MAE, making it the best-performing model overall — even slightly outperforming the hyperparameter-tuned version. It was therefore selected as the final model and integrated into the backend for predictions.

---

## Author & Contact <a name="author--contact"></a>

- **Author:** Ashutosh Rout
- **Email:** ashutoshrout704@gmail.com
- **LinkedIn:** https://www.linkedin.com/in/ashutosh-rout-aa60832a1/
- **GitHub:** https://github.com/ashutosh-rout257
