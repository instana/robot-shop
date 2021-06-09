import sys,time
from selenium import webdriver 
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

# parameters
HOST=sys.argv[1]
ROUND=sys.argv[2]

chrome_options = Options()
chrome_options.add_argument("--disable-extensions")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--headless")
chrome_options.add_argument("--use--fake-ui-for-media-stream")

driver = webdriver.Chrome(options=chrome_options)

print("-->START:" + ROUND)

driver.get(HOST)

driver.find_element(By.LINK_TEXT, "Login / Register").click()
time.sleep(1)
driver.find_element(By.XPATH, "/html/body/div/div[1]/div[2]/div/div/div[2]/table[1]/tbody/tr[1]/td[2]/input").click()
driver.find_element(By.XPATH, "/html/body/div/div[1]/div[2]/div/div/div[2]/table[1]/tbody/tr[1]/td[2]/input").send_keys("stan")
driver.find_element(By.XPATH, "//input[@type=\'password\']").click()
driver.find_element(By.XPATH, "//input[@type=\'password\']").send_keys("bigbrain")
driver.find_element(By.XPATH, "//button[contains(.,\'Login\')]").click()
time.sleep(1)
driver.find_element(By.XPATH, "//span[contains(.,\'Artificial Intelligence\')]").click()
time.sleep(1)
driver.find_element(By.XPATH, "//a[contains(text(),\'Ewooid\')]").click()
time.sleep(0.5)
driver.find_element(By.ID, "vote-4").click()
driver.find_element(By.LINK_TEXT, "Stan").click()
time.sleep(0.5)
driver.find_element(By.CSS_SELECTOR, ".ng-scope > button").click()
driver.find_element(By.LINK_TEXT, "Watson").click()
time.sleep(0.5)
driver.find_element(By.XPATH, "//button[contains(.,\'Add to cart\')]").click()
driver.find_element(By.XPATH, "//span[contains(.,\'Robot\')]").click()
time.sleep(0.5)
driver.find_element(By.LINK_TEXT, "Cybernated Neutralization Android").click()
time.sleep(0.5)
driver.find_element(By.ID, "vote-5").click()
driver.find_element(By.LINK_TEXT, "Cart").click()
time.sleep(0.5)
driver.find_element(By.XPATH, "//button[contains(.,\'Checkout\')]").click()

print("-->END:" + ROUND)

driver.close()
