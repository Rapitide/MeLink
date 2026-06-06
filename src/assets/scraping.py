from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

print("🤖 ロボット起動中...")

# Chromeブラウザを自動で立ち上げる魔法の設定
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service)

# 埼玉大学のシラバス検索ページを開く
url = "https://syllabus.saitama-u.ac.jp/portal/public/syllabus/SyllabusSearchStart.aspx"
driver.get(url)

print("🌐 ページを開きました！")
print("※ ここで手動でログインなどを行ってください。")
print("※ 準備ができたら、この黒い画面で「Enterキー」を押すと次に進みます。")

# 人間がログインを終えてEnterキーを押すまで、ロボットを一時停止して待機させる
input("終わったら、ここをクリックしてEnterキーを押してください...")

# ブラウザを閉じる
driver.quit()
print("🤖 ロボット終了！")