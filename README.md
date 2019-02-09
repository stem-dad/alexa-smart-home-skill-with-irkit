# alexa-smart-home-skill-with-irkit

---

## Alexa の Smart Home スキルでirkitを操作する

Alexaには①カスタムスキルと②スマートホームスキル、③フラッシュブリーフィングスキルがあります（[参考](https://developer.amazon.com/ja/docs/ask-overviews/understanding-the-different-types-of-skills.html))

①のカスタムスキルの場合「アレクサ、タイドプーラーでシアトルの満潮を調べて。」と呼びかけてスキルを起動します。この時の”タイドプーラー"はスキルを識別するための呼び出し名となっており、カスタムスキルでは必ず「呼び出し名(+対象)+アクション」を毎回話さなければならず意外と面倒です。

一方、②のスマートホームスキルでは、「アレクサ、電気をつけて」という感じで、呼び出し名がいらず「対象+アクション」のみでスキルを起動できます。その代わり、アクションはON/OFFや温度を上げる/下げるなど、限られたものだけしか対応していません。

ここでは Smart Home スキルを作成し、Lambdaからirkitの信号をPOSTすることで、Amazon Echo (dot) に呼びかけるだけで室内のirkitを用いた家電の制御ができるようになります。


## 開発で使うコマンド

irkitを探してIPも確認

```
dns-sd -B _irkit._tcp
dns-sd -G v4 iRKit****.local
```

irkitがキャッチした赤外線信号のjsonを取得

```
curl -i "http://[irkitのIP]/messages" -H "X-Requested-With: curl"
```