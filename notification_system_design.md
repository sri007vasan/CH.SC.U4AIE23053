# notification system design

## so basically we need to build a notification system for students. the main things it should do are - fetch notifications, send new ones, mark them read, delete them etc.

stage 1: i made simple api endpoints like GET to fetch and POST to send. we will use websockets so notifications come instantly without reloading.

stage 2 & 3: i chose postgresql db because its free and reliable

stage 4 & 5: to stop the database from dying on page load, we can use redis cache to store recent notifs. 

stage 6: for priority inbox, i made a python script that gives points to notifications.
