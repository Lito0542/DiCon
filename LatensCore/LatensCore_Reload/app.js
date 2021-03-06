var express = require('express');
var app = express()
server = require('http').Server(app);
var io = require('socket.io').listen(server)
var bodyParser = require('body-parser');

let lobby = []
let roomObjects = {}
let userRoomInfo = {}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  limit: '1gb',
  extended: false
}));

server.listen(80)

console.log("server start")

app.get('/', (req, res) => { //메인 페이지
  res.sendfile(__dirname+"/game.html")
});
app.get('/res/:resource', (req, res) => {
  res.sendfile(__dirname+"/res/"+req.params.resource)
  console.log(req.params.image);
});
class basicObject{
  constructor(width,height,x,y){
    this.width = width
    this.height = height
    this.x = x
    this.y = y
  }
}
class userObject extends basicObject{
  constructor(x,y,color){
    super(50,50,x,y)
    this.color = color
  }
}
class roomObject{
  constructor(user1,user2){
    this.userObjects = {}
    this.userObjects[user1] = undefined
    this.userObjects[user2] = undefined
    this.users = [user1,user2]
    this.roomname = this.users[0]+this.users[1]
    this.isRoomReady = false
    this.skills
    userRoomInfo[user1] = this.roomname
    userRoomInfo[user2] = this.roomname
    try{
    io.sockets.sockets[user2].emit('matching',{roomname:this.roomname,player:2})
    io.sockets.sockets[user1].emit('matching',{roomname:this.roomname,player:1})
    }
    catch(e){
      if(io.sockets.sockets[this.users[0]] != undefined)
        io.sockets.sockets[this.users[0]].emit('otheruser_disconnect')
      if(io.sockets.sockets[this.users[1]] != undefined)
        io.sockets.sockets[this.users[1]].emit('otheruser_disconnect')
      console.log(e);
    }
    console.log('making room : '+this.roomname);
  }
  update(){
    io.sockets.sockets[this.users[0]].emit('update',this.userObjects)
    io.sockets.sockets[this.users[1]].emit('update',this.userObjects)
  }
  ready(data,socketid){
    this.userObjects[socketid] = new userObject(data.x,data.y,data.color)
    console.log('this.userObjects[this.users[0]] : '+this.userObjects[this.users[0]]);
    console.log('this.userObjects[this.users[1]] : '+this.userObjects[this.users[1]]);
    if(this.userObjects[this.users[0]] != undefined&&this.userObjects[this.users[1]] != undefined){
      io.sockets.sockets[this.users[0]].emit('ready')
      io.sockets.sockets[this.users[1]].emit('ready')
      this.isRoomReady = true
      console.log(this.roomname +" : it's ready");
    }
  }
  disconnect(user){
    if(io.sockets.sockets[this.users[1]]!=undefined)
      io.sockets.sockets[this.users[1]].emit('otheruser_disconnect')
    if(io.sockets.sockets[this.users[0]]!=undefined)
      io.sockets.sockets[this.users[0]].emit('otheruser_disconnect')
    delete roomObjects[this.roomname]
  }
}
io.on('connect', (socket) => {
  console.log("entered : "+socket.id);
  socket.on("matching",(data)=>{
    lobby.push(socket.id)
    console.log(lobby.length);
    if(lobby.length === 2){
      roomObjects[lobby[0]+lobby[1]] = new roomObject(lobby[0],lobby[1])
      lobby = []
    }
  })
  socket.on('ready',(data)=>{
    roomObjects[data.roomname].ready(data,socket.id)
  })
  socket.on("update",(data)=>{
    try{
      roomObjects[data.roomname].userObjects[socket.id].x = data.x
      roomObjects[data.roomname].userObjects[socket.id].y = data.y
      this.skills = data.skills
    // console.log("update "+data.x)
  }
  catch(error){
    console.log(error+"\n\n")
    console.log(roomObjects)
    console.log(data);
  }
  })
  socket.on('disconnect', (data) => {
    console.log("disconnected : "+socket.id);
    if(socket.id === lobby[0]){
      lobby = []
    }
    try{
      if(roomObjects[userRoomInfo[socket.id]] != undefined)
        roomObjects[userRoomInfo[socket.id]].disconnect(socket.id)
    }
    catch(e){
      console.log(e);
    }
  })
  setInterval(function() {
    for(let room in roomObjects){
      if(roomObjects[room].isRoomReady)
        roomObjects[room].update()
    }
  },10)

})
