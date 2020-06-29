require('dotenv').config()
const express = require("express")
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const passportLocalMongoose = require("passport-local-mongoose");

const ejsLint = require('ejs-lint');


const app = express();

app.use(express.static(__dirname + '/public'));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    
  }))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/walletUserDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
mongoose.set('useCreateIndex', true);


const spendingItemSchema = new mongoose.Schema({
  time:String,
  amount:Number,
  description:String,
  type:String
})

const SpendingListItem = new mongoose.model("SpendingListItem",spendingItemSchema);

const walletSchema = new mongoose.Schema({
  name:String,
  balance:Number,
  spendinglist:[spendingItemSchema]
})
const Wallet = new mongoose.model("Wallet",walletSchema);

const userSchema = new mongoose.Schema({
    fName:String,
    Lname:String,
    phNo:Number,
    username:String,
    password:String,
    wallets:[walletSchema]
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);


passport.use(User.createStrategy());
 
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.get("/",function(req,res){
    res.render("home");
})


app.get("/register",function(req,res){
    res.render("register");
})

app.get("/wallets" , function(req,res){
    if(req.isAuthenticated()){   
        User.findById(req.user._id,function(err,foundUser){
          if(!err){
            if(foundUser){
              var wallets = foundUser.wallets;
              res.render("wallets",{walletList:wallets})

            }
          } else {
            console.log(err)
          }
          
        })
        
    }else {
        res.redirect("/");
    }
})

app.get("/wallets/:walletId",function(req,res){

    const requestedWalletId = req.params.walletId;
    

    if(req.isAuthenticated()){
      User.findById(req.user._id,function(err,foundUser){
        let obj = foundUser.wallets.find(o => o.id === requestedWalletId);
        res.render("customWallet",{wallet:obj})
      })
    }
})  


app.post("/register",function(req,res){
    User.register({
                    username:req.body.username,
                    fName:req.body.fName,
                    Lname:req.body.lName,
                    phNo:req.body.phno,
                  }, req.body.password, function(err, user) {
      if(err){
        console.log(err);
        res.redirect("/register")
      } else {
        passport.authenticate('local')(req,res,function(){
          res.redirect("/wallets")  
          
        })
      }

    })
})

app.post("/login",function(req,res){
  const user = new User({
    username:req.body.username,
    password:req.body.password
  })  

   req.login(user,function(err){
     if(err){
       console.log(err);
     } else {
      passport.authenticate('local')(req,res,function(){
        res.redirect("/wallets")  
      });
     }
   })
})

app.post("/wallets",function(req,res){

    User.findById(req.user._id,function(err,foundUser){
        if(!err){
            if(foundUser){
                const newWallet = new Wallet(
                  {    name:req.body.name,
                       balance:req.body.balance
                   })
                foundUser.wallets.push(newWallet);
                foundUser.save(function(err){
                  if(!err){
                    res.redirect("/wallets")
                  }
                })

            }
        } else{
            console.log(err);
        }
    })       
})

app.post("/transaction",function(req,res){
  const walletId = req.body.itemWalletId;
  var today = new Date();
  var dd = today.getDate();

var mm = today.getMonth()+1; 
var yyyy = today.getFullYear();
if(dd<10) 
{
    dd='0'+dd;
} 

if(mm<10) 
{
    mm='0'+mm;
} 
today = mm+'-'+dd+'-'+yyyy;
  const item = new SpendingListItem({
    time: today,
    amount:req.body.itemAmount,
    type:req.body.itemType,
    description:req.body.itemDescription

  })
  User.findById(req.user._id,function(err,foundUser){
    if(!err){
      if(foundUser){
        let obj = foundUser.wallets.find(o => o.id === walletId);
        obj.balance = obj.balance - item.amount;
        obj.spendinglist.push(item);
        foundUser.save(function(err){
          if(!err){
            res.redirect("/wallets/"+ walletId);
          }
        })
      }
    }
  })
  
})

app.post("/deleteTransaction/:walletId",function(req,res){
  User.findById(req.user._id,function(err,foundUser){
    
    if(!err){
      if(foundUser){
        let wallet = foundUser.wallets.find(o => o.id === req.params.walletId);
        let listItem = wallet.spendinglist.find(o => o.id === req.body.deleteItemId);
        wallet.balance = wallet.balance + listItem.amount;
        wallet.spendinglist.pull({_id:req.body.deleteItemId})
        
        foundUser.save(function(err){
          if(!err){
            res.redirect("/wallets/" + req.params.walletId);
          }
        })
      }
    }
  })
})

app.post("/deleteWallet",function(req,res){
  
  User.findById(req.user._id,function(err,foundUser){
    
    if(!err){
      if(foundUser){
        foundUser.wallets.pull({_id:req.body.walletId})
        foundUser.save(function(err){
          if(!err){
            res.redirect("/wallets");
          }
        })
      }
    }
  })
})

app.listen(3000,function(){
    console.log("Server runnning on PORT 3000");
})