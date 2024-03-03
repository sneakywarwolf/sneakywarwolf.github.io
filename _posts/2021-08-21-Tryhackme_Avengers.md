---
title: Avengers Blog Writeup-TryHackMe
author: <1>
date: 2021-05-30 16:35:00 +0530
categories: [VAPT, Tryhackme]
tags: [SQL Injection]
pin: false
img_path: /assets/4blogs/avengers/
---

![Intro](1.png){: width="850" height="200"}

Learn to hack into Tony Stark's machine! You will enumerate the machine, bypass a login portal via SQL injection and gain root access by command injection. TryHackMe Avengers Blog writeup

## [Task1] Deploy

![Deploy-Image](2.png){: width="850" height="200"}
_Connect to the network and deploy the machine_

## [Task 2] Cookies

HTTP Cookies is a small piece of data sent from a website and stored on the user's computer by the user's web browser while the user is browsing. They're intended to remember things such as your login information, items in your shopping cart or language you prefer.
Advertisers can use also tracking cookies to identify which sites you've previously visited or where about's on a web-page you've clicked. Some tracking cookies have become so intrusive, many anti-virus programs classify them as spyware.
You can view & dynamically update your cookies directly in your browser. 

>To do this, press F12 (or right click and select Inspect) to open the developer tools on your browser, then click Application and then Cookies.
{: .prompt-info }

<br/>
#1 On the deployed Avengers machine you recently deployed, get the flag1 cookie value.

![flag](3.png){: width="850" height="200"}
_Check the flag from cookie_


## [Task 3] HTTP Headers

HTTP Headers let a client and server pass information with a HTTP request or response. Header names and values are separated by a single colon and are integral part of the HTTP protocol.

![http-headers](4.png){: width="972" height="589" .w-50 .right}

The main two HTTP Methods are POST and GET requests. The GET method us used to request data from a resource and the POST method is used to send data to a server.
We can view requests made to and from our browser by opening the Developer Tools again and navigating to the Network tab. Have this tab open and refresh the page to see all requests made. You will be able to see the original request made from your browser to the web server.
#1 Look at the HTTP response headers and obtain flag 2.

## [Task 4] Enumeration and FTP
In your terminal, execute the following command:
DO a nmap scan on the IP, we get the following result:

![nmap-scan](5.png){: width="550" height="150"}

Port 80 has a HTTP web server running on it<br/>
Port 22 is to SSH into the machine<br/>
Port 21 is used for FTP (file transfer)<br/>


We can see a FTP service. If you read the Avengers web page, you will see that Rocket made a post asking for Groot's password to be reset, the post included his old password too!

![Rocket](6.png){: width="750" height="150"}

Connect to the ftp service:

`ftp -p <IP>`

>Asked to connect in passive mode thats why used "-p"
{: .prompt-tip }

We will be asked for a username (groot) and a password (iamgroot). We should have now successfully logged into the FTP share using Groots credentials!

![flag3](7.png){: width="550" height="150"}
_Extract flag3.txt_

## [Task 5] GoBuster

Lets use a fast directory discovery tool called GoBuster. This program will locate a directory that you can use to login to Mr. Starks Tarvis portal!
GoBuster is a tool used to brute-force URIs (directories and files), DNS subdomains and virtual host names. For this machine, we will focus on using it to brute-force directories.

>You can either download GoBuster, or use the Kali Linux machine that has it pre-installed.
{: .prompt-tip }

Lets run GoBuster with a wordlist (on Kali they're located under /usr/share/wordlists):

```
gobuster dir -u http://<machine_ip> -w <word_list_location>
```

#1 What is the directory that has an Avengers login?

## [Task 6] SQL Injection

You should now see the following page above. We're going to manually exploit this page using an attack called SQL injection.
SQL Injection is a code injection technique that manipulates an SQL query. You can execute you're own SQL that could destroy the database, reveal all database data (such as usernames and passwords) or trick the web server in authenticating you.
To exploit SQL, we first need to know how it works. A SQL query could be
 
 `SELECT * FROM Users WHERE username = {User Input} AND password ={User Input 2}`

if you insert additional SQL as the {User Input} we can manipulate this query. For example, if I have the {User Input 2} as ' 1=1 we could trick the query into authenticating us as the ' character would break the SQL query and 1=1 would evaluate to be true.
To conclude, having our first {User Input} as the username of the account and {User Input 2} being the condition to make the query true, the final query would be:

`SELECT * FROM Users WHERE username = 'admin' AND password ='1=1`

This would authenticate us as the admin user.

Log into the Avengers site. View the page source, how many lines of code are there?

`username :- ' or 1=1--`
`password :- ' or 1=1--`

after getting in this will be the pageRight click > view page source > count no of code
![source-code](8.png){: width="450" height="100"}

# [Task 7] Remote Code Execution and Linux

You should be logged into the Jarvis access panel! Here we can execute commands on the machine.. I wonder if we can exploit this to read files on the system.

Try executing the `ls` command to list all files in the current directory. Now try joining 2 Linux commands together to list files in the parent directory:
`cd../;ls`doing so will show a file called flag5.txt, we can add another command to read this file: cd ../; ls; cat flag5.txt


#1 Read the contents of flag5.txt

![ls-command](9.png){: width="750" height="100"}

But oh-no! The cat command is disallowed! We will have to think of another Linux command we can use to read it!
so, type the following command and hit enter :-

![ls-command](10.png){: width="750" height="100"}
but this flag is not correct, copy this flag and go to your linux terminal and type the following command and hit enter

echo "theflagwhichyougot" | rev <br/>
![ls-command](11.png){: width="350" height="100" .normal}


>This was written for educational purpose and pentest only. This information shall only be used to expand knowledge and not for causing malicious or damaging attacks. Performing any hacks without written permission is illegal!!