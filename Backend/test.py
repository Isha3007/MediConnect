import time
import unittest

import requests
from selenium import webdriver
from selenium.webdriver.common.by import By

PATIENT_EMAIL = "nandini.gulhane22@vit.edu"
DOCTOR_EMAIL = None
OTP = None


class HomepageTest(unittest.TestCase):

    def setUp(self):
        self.driver = webdriver.Chrome()

    def test_01_homepage_loads(self):
        self.driver.get("http://localhost:3000/")
        time.sleep(2)

        title = self.driver.title
        self.assertEqual(title, "MediConnect")

    def test_02_patient_login(self):
        global DOCTOR_EMAIL
        global OTP

        self.driver.get("http://localhost:3000/")
        time.sleep(2)
        response = requests.post(
            "http://localhost:5000/api/v1/patient/generate-otp",
            json={"email": PATIENT_EMAIL, "name": "Patient", "picture": ""},
        ).json()

        patient_token = response["access_token"]
        OTP = response["otp"]
        # print(OTP)
        self.driver.execute_script(f"localStorage.setItem('token', '{patient_token}');")
        self.driver.execute_script(f"localStorage.setItem('otp', {OTP});")

        self.driver.get("http://localhost:3000/patient/doctor_list")
        time.sleep(5)

        current_url = self.driver.current_url
        self.assertIn("/patient/doctor_list", current_url)

        specific_div = self.driver.find_element(By.CLASS_NAME, "bg-card")
        doctor_emailid_div = specific_div.find_element(By.CLASS_NAME, "font-semibold")
        DOCTOR_EMAIL = doctor_emailid_div.text

        specific_div.click()
        time.sleep(1)
        continue_button = self.driver.find_element(By.CSS_SELECTOR, "button.bg-red-600")
        continue_button.click()
        time.sleep(5)

        otp_div = self.driver.find_element(
            By.CSS_SELECTOR, "div[data-slot='card-content'] > div.bg-red-50 > div.flex"
        )
        otp_text = "".join(otp_div.text.split("\n"))
        self.assertEqual(f"{OTP}", otp_text)

    def test_03_doctor_login(self):
        self.driver.get("http://localhost:3000/doctor/login")
        time.sleep(2)

        current_url = self.driver.current_url
        self.assertIn("/doctor/login", current_url)

        doctor_email_input = self.driver.find_element(
            By.CSS_SELECTOR, "input[type='email']"
        )
        doctor_email_input.send_keys(DOCTOR_EMAIL)
        doctor_password_input = self.driver.find_element(
            By.CSS_SELECTOR, "input[type='password']"
        )
        doctor_password_input.send_keys("test1234")

        login_button = self.driver.find_element(By.CSS_SELECTOR, "button.bg-red-600")
        login_button.click()
        time.sleep(5)

        current_url = self.driver.current_url
        self.assertNotIn("/doctor/login", current_url)
        self.assertIn("/doctor", current_url)

        otp_input = self.driver.find_element(By.ID, "otp")
        otp_input.send_keys(str(OTP))
        verify_button = self.driver.find_element(By.CSS_SELECTOR, "button.bg-red-600")
        verify_button.click()
        time.sleep(5)

        current_url = self.driver.current_url
        self.assertIn("/chat", current_url)

    def tearDown(self):
        self.driver.quit()


if __name__ == "__main__":
    unittest.main()
