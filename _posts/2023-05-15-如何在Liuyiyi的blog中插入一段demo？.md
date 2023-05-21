---
layout: post
title: 如何在Liuyiyi的blog中插入一段demo？
subtitle: markdown中插入gradio的demo
categories: blog
tags: [blog, gradio]
---

> blog中可以插入一些demo，交互式的demo可以让blog更具有表现力


[gradio](https://www.gradio.app/)只需通过几行python代码，即可制作一个机器学习的demo，[hugging face space](https://huggingface.co/spaces)中大多都是由gradio实现的。
使用hugging face space托管我们的gradio应用，即可获得一个可以被互联网访问的demo应用。
如何把gradio制作的demo放到blog页面中呢？

实现思路有二：
- 思路一：使用gradio的script
- 思路二：使用iframe

## 实现思路一：
在markdown中插入下面这段代码即可：
```html
<script type="module" src="https://gradio.s3-us-west-2.amazonaws.com/3.23.0/gradio.js"></script>
<gradio-app space="PAIR/Text2Video-Zero"></gradio-app>
```
如果想插入其它的Demo只需要更改`gradio-app`标签中的参数，其中space是由huggingface space托管的gradio应用的名字

效果如下：
<script type="module" src="https://gradio.s3-us-west-2.amazonaws.com/3.23.0/gradio.js"></script>
<gradio-app space="PAIR/Text2Video-Zero"></gradio-app>

<!-- 
在这篇blog中插入了一段demo演示
https://huggingface.co/blog/text-to-video -->
<!-- 在github仓库中看到了blog的源码，blog是用markdown写的，插入的是由huggingface space 托管的一段代码 -->
<!-- 如何在markdown中放gradio的demo？ -->

## 实现思路二：
也可以使用iframe，markdown中插入如下代码即可，其中src参数填写想要展示的页面的url即可
```html
 <iframe  
 height=850 
 width=90% 
 src="https://course-demos-marian-finetuned-kde4-en-to-fr.hf.space/"  
 frameborder=0  
 allowfullscreen>
 </iframe>
 ```
 效果如下：
 <iframe  
 height=850 
 width=90% 
 src="https://course-demos-marian-finetuned-kde4-en-to-fr.hf.space/"  
 frameborder=0  
 allowfullscreen>
 </iframe>