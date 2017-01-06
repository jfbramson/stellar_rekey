// Copyright (c) 2017 John Bramson 

"use strict";
  //var server; 
    window.addEventListener("load", function(event) {
      //StellarSdk.Network.useTestNetwork();
 
      var server = new StellarSdk.Server({     
          hostname: "horizon-testnet.stellar.org",
          //hostname: "horizon-live.stellar.org",
          port: 443,
          protocol: "https",
          secure: true
        });

      StellarSdk.Network.use(new StellarSdk.Network("Test SDF Network ; September 2015" ));
      //StellarSdk.Network.use(new StellarSdk.Network("Public Global Stellar Network ; September 2015"));
      
      var source_account = document.getElementById("source_account");
      var source_seed = document.getElementById("source_seed");
      var source_balance = document.getElementById("source_balance");
      var tx_status = document.getElementById("tx_status");

      var dest_account = document.getElementById("dest_account");
      var dest_seed = document.getElementById("dest_seed");
      var dest_balance = document.getElementById("dest_balance");
      
      var key;
      var max_trustlines = 7;
      var transaction;

      tx_status.textContent = "Idle";
      dest_balance.textContent = 0;
      source_balance.textContent = 0;

      // preload alarm sound
      var alarm = new Audio();
      alarm.autoplay = false;
      //alarm.src = navigator.userAgent.match(/Firefox/) ? 'sound.ogg' : 'sound.mp3';
      //alarm.src = "./sound.mp3";
      //alarm.play();     
        
      //update_balance();
    
      function play_alarm_sound() {
        console.log("play_alarm_sound");        
        alarm.play();        
      }

      
     function add_trust_to_merge(callback){
       console.log("add_trust_to_merge");
       tx_status.textContent = "Add Needed Trustlines";
       var array_opps = add_trust_array_get_opps(chain_store["source"].balances,"",chain_store["destination"].balances,2)
       console.log("array_opps");
       console.log(array_opps);
       if (array_opps.length > 0){
          console.log("call create_tx");
          //create_tx_opp_array(array_opps,callback);
          var dest_keypair = StellarSdk.Keypair.fromSeed(dest_seed.value);
          createTransaction_array_for_keypair(array_opps,dest_keypair,callback);
        }else{
          console.log("array_opps.length zero, all needed trustlines present, nothing done");
          callback();
        }      
     }

     function remove_all_trustlines(callback){
       // remove all trustlines from source_account, note all trustlines must have zero balance before running this
       console.log("start remove_all_trustlines");
       tx_status.textContent = "Remove All Source Account Trustlines";
       var array_opps = [];
       for (var i = 0; i < chain_store["source"].balances.length; i++) {
         if (chain_store["source"].balances[i]["asset_type"] != "native"){
           array_opps[i] = addTrustlineOperation(chain_store["source"].balances[i]["asset_code"], chain_store["source"].balances[i]["asset_issuer"], "0"); 
         }
       }
       if (array_opps.length > 0){
         console.log("trustlines detected will remove with array_opps");
         create_tx_opp_array(array_opps,callback);
       }else{
         console.log("no trustlines detected, nothing done");
         callback();
       }
     }

     
     function add_trust_array_get_opps(array_trustlines,limit,dest_balances,mode){
        // mode = 2 if array_trustlines is in format from server.acounts(), mode 1 is used for data from stellar.toml file
        // dest_balances are an array list of assets from destination account
        // example format mode 1 array_trustlines to be added to destination account:
        // [{code:"USD",issuer:"GBUY..."},{code:"THB",issuer:"GBUY..."}]
        var array_opps = [];
        for (var i = 0; i < array_trustlines.length; i++) {
          if (mode == 2){
            array_trustlines[i]["code"] = array_trustlines[i]["asset_code"];
            array_trustlines[i]["issuer"] = array_trustlines[i]["asset_issuer"];
          }
          if (check_trust_exists(array_trustlines[i]["code"], array_trustlines[i]["issuer"] , max_trustlines ,dest_balances) == false){
            console.log("trustline : " + array_trustlines[i] + " doen't exist so we will add opp to add: " + array_trustlines[i]["code"]);
            array_opps[i] = addTrustlineOperation(array_trustlines[i]["code"], array_trustlines[i]["issuer"], limit);                       
          }
        }
        console.log("array_opps");
        console.log(array_opps);        
        return array_opps;        
     }

     function move_all_assets(callback){
        // move all non native assets from source_account to dest_account account
        console.log("start move_all_assets");
        tx_status.textContent = "Move All assets to destination";
        var opp_array = [];
        var asset_obj;
        for (var i = 0; i < chain_store["source"].balances.length; i++) {
          if (chain_store["source"].balances[i]["asset_type"] != "native"){
             asset_obj = new StellarSdk.Asset(chain_store["source"].balances[i]["asset_code"], chain_store["source"].balances[i]["asset_issuer"]);
             opp_array[i] = StellarSdk.Operation.payment({
               destination: dest_account.value,
               amount: fix7dec(chain_store["source"].balances[i]["balance"]),
               asset: asset_obj
             });
          }
        }
        console.log("opp_array: ");
        console.log(opp_array);
        create_tx_opp_array(opp_array,callback);
     }

     function merge_native(callback){
       // merger all native assets from active account to dest_account.value account
       tx_status.textContent = "Merge Native XLM asset to Destination account";
       var opp = accountMergeOperation();
       create_tx(opp,callback);
     }

     function update_bal_callback(callback){
        console.log("start update_bal_callback");
        console.log(chain_store);    
        source_balance.textContent = get_native_balance(chain_store["source"]);
        dest_balance.textContent = get_native_balance(chain_store["destination"]);
        callback();  
     }

     var chain_store = {};
     //chain_store["source"] = "";
     function merge_all_assets_Tx(){      
       console.log("start merge_all_assets_Tx");
       // setup chain of callback functions       
       var cc = new ccbuild.CallChain();
       cc.add(get_source_account_info);
       cc.add(get_dest_account_info);
       cc.add(create_account_if_zero);
       cc.add(get_dest_account_info);
       cc.add(add_trust_to_merge);
       cc.add(move_all_assets);
       cc.add(remove_all_trustlines);
       cc.add(merge_native);
       cc.add(get_dest_account_info);
       cc.add(get_source_account_info);
       cc.add(update_bal_callback);
       cc.add(noop);
       cc.execute();
     }

     function update_balance_func(){      
       console.log("update_balance");
       // setup chain of callback functions       
       var cc = new ccbuild.CallChain();
       cc.add(get_source_account_info);
       cc.add(get_dest_account_info);
       cc.add(update_bal_callback);
       cc.add(noop);
       cc.execute();
     }

    

     function create_account_if_zero(callback){
       // create or add to account in dest_seed.value if no native balance seen in chain_store["accountInfo"].balances"]
       // with start native balance for what is needed to hold present active account
       console.log("start create_acccount_if_zero");
       tx_status.textContent = "Create Destination Account";
       var clone_keypair = StellarSdk.Keypair.fromSeed(dest_seed.value);
       var start_bal = ((chain_store["source"].balances.length - 1) * 10) + 20.001;
       console.log(chain_store);
       if (chain_store["destination"] == 404) {
         console.log("no account present so create one");         
         console.log("start_bal needed is: " + start_bal);         
         var opp = StellarSdk.Operation.createAccount({
                   destination: clone_keypair.accountId(),
                   startingBalance: fix7dec(start_bal)
                 });
         create_tx(opp,callback);
       }else{
         tx_status.textContent = "Destination Account already exists";
         console.log("account already exist, check to see if has native balance needed");
         var nativebal_merge = find_bal(chain_store["destination"].balances,"native");
         var native_bal_active = find_bal(chain_store["source"].balances,"native");
         console.log("nativebal: " + nativebal_merge);
         var send = start_bal - nativebal_merge ;
         var asset_obj = new StellarSdk.Asset.native();
         if ( send > 0 ) {
           console.log("need to send native: " + send);
           tx_status.textContent = "Adding minimum needed native to Destination Account";
           var opp = StellarSdk.Operation.payment({
               destination: clone_keypair.accountId(),
               amount: fix7dec(send),
               asset: asset_obj
             });
           create_tx(opp,callback);
         }else{
           console.log("merge account exists and holds needed amount of native, nothing need be done");
           callback();
         }
       }
     }

     function create_tx(opp,callback){
       console.log("create_tx");
       var opp_array = [];
       opp_array[0] = opp;
       createTransaction_array_for_keypair(opp_array,key,callback);
     }

     function  create_tx_opp_array(opp_array,callback){
       createTransaction_array_for_keypair(opp_array,key,callback);
     }
        
     function find_bal(balances,asset_code){
       // return balance for asset code in balances array that is returned from horizon
       // use XLM or native if looking for native balance
       var bal = 0;
       for (var i = 0; i < balances.length; i++) {
         if (asset_code == "XLM" || asset_code == "native"){
           if (balances[i].asset_type == "native"){
             bal = balances[i].balance;
             break;
           }else{
             if (balances[i].asset_code == asset_code) {
               bal = balances[i].balance;
               break;
             }
           }
         }
       }
       return bal;
     }
     
     function noop(callback){
       // performs almost no action to signal end callback chain without error (no callback done)
       tx_status.textContent = "TX Completed OK";
       console.log("started noop");
       console.log("chain_store");
       console.log(chain_store);       
     }
        
     function get_dest_account_info(callback){ 
       tx_status.textContent = "Check Destination Account info";      
       get_account_info(dest_account.value,"destination",callback);
     }

     function get_source_account_info(callback){
       tx_status.textContent = "Check Source Account info";
       get_account_info(source_account.value,"source",callback);
     }

     function get_account_info(accountId,store_key,callback){      
        server.accounts()
             .accountId(accountId)
             .call()
             .then(function (accountInfo) {
               chain_store[store_key] = accountInfo;
               console.log("accountInfo: " + store_key);
               console.log(accountInfo);
               callback();
             })
             .catch(function(err) {
               console.log("accountInfo error: " + store_key);
               console.log(err);
               if (err.data.status == 404){
                 chain_store[store_key] = 404;
               };               
               callback();
             });
     }

     var ccbuild = ccbuild || {};
     ccbuild.CallChain = function () {
       var cs = [];
       this.add = function (call) {
         cs.push(call);
       };
       this.execute = function () {
         var wrap = function (call, callback) {
            return function () {
                call(callback);
            };
         };
         for (var i = cs.length-1; i > -1; i--) {
            cs[i] = 
                wrap(
                    cs[i], 
                    i < cs.length - 1 
                        ? cs[i + 1] 
                        : null);
         }
         cs[0]();
       };
     };

               
         function check_trust_exists(asset_code, issuer, max_count, balances){
           //example check_trust_exists("FUNT","GBYX...",3, balances);
           // will return true if asset_code already exists or if max_count number of trustlines already exist
           // this allows setting max_count = 0 to disable adding trustlines
           // balances is an array of all currencies assets presently held on this account being checked
           // balances = [{asset_code:"USD",issuer:"GBUYU..."},{asset_code:"THB",issuer:"GBUYU..."}]
           console.log("trustlines count: " + balances.length);
           if (balances.length >= max_count){
              console.log("return true due to balances.length >= max_count value: " + max_count);
              return true;
           }
           for (var i = 0; i < balances.length; i++) {
             if (balances[i].asset_code == asset_code || balances[i].code == asset_code){
               if (balances[i].issuer == issuer || balances[i].asset_issuer == issuer ){
                 return true;
               }
             }
           }
           return false;
         }

                        
      function display_message(param) {
        //message.textContent = JSON.stringify(param);
      }
            

      function get_native_balance(account_obj){
        console.log("get_native_balance");
        console.log(account_obj);
        var bal = 0;
        if (account_obj == 404){
          return 0;
        }
        if (account_obj.name !== "NotFoundError"){
          account_obj.balances.forEach(function(entry) {
            //console.log(entry);
            if (entry.asset_type == "native") {
              //console.log("entry.bal: " + entry.balance);
              bal = entry.balance;
            }                          
          });
          console.log(bal);
          return bal;
        } else {
          console.log("no account active return -1");
          return -1;
        }
      }

                      
      function update_key() {
        if (source_seed.value.length == 56) {
          key = StellarSdk.Keypair.fromSeed(source_seed.value);
          source_account.value = key.accountId();          
        }
        if (dest_seed.value.length == 56) {
          var dest_key = StellarSdk.Keypair.fromSeed(dest_seed.value);
          dest_account.value = dest_key.accountId();          
        }        
      }
      
                
      function createTransaction_array_for_keypair(array_of_operations,keypair,post_callback) {
         console.log("start createTransaction_array_for_keypair");
         console.log("account: " + keypair.accountId());
         if (array_of_operations.length == 0){
           console.log("operations array length is zero, nothing to do so return");
           post_callback();
           return;
         }
         tx_status.textContent = "Processing Tx";
         server.loadAccount(keypair.accountId())
          .then(function (account) {
             transaction = new StellarSdk.TransactionBuilder(account)            
             array_of_operations.forEach(function (item) {
               transaction.addOperation(item);
             });
             transaction = transaction.build();
             transaction.sign(keypair); 
             console.log("sending tx");
             tx_status.textContent = "Submiting Tx"                               
             server.submitTransaction(transaction).then(function(result) {              
               tx_status.textContent = "Tx Completed OK";
               if (post_callback != "no_op"){
                 post_callback("");
               }
             }).catch(function(e) {
               console.log("submitTransaction error");
               console.log(e);
               tx_status.textContent = "Transaction failed";
               if (e.extras.result_codes.transaction == "tx_bad_auth"){
                  tx_status.textContent = "Transaction error: tx_bad_auth";
               } else {           
                 tx_status.textContent = "Transaction error: " + e.extras.result_codes.operations[0];
               } 
             });                      
          })
          .then(function (transactionResult) {
            console.log("tx_result");
            console.log(transactionResult);
            if (typeof transactionResult == "undefined") {
              console.log("tx res undefined");
            }            
          })
          .catch(function (err) {
            console.log(err);
            tx_status.textContent = "Transaction Error: " + err; 
          });
       }

     

      function fix7dec(string) {
        var num = Number(string).toFixed(7);
        string = num.toString();
        return string;
      }
     

      function accountMergeOperation() {
                 console.log("accountMergeOperation");
                 console.log(dest_account.value);
                 return StellarSdk.Operation.accountMerge({
                   destination: dest_account.value
                 });                                     
               }

      function addTrustlineOperation(asset_type, address, limit) {
                 console.log("addTrustlineOperation");
                 var asset = new StellarSdk.Asset(asset_type, address);
                 if (limit.length == 0){
                   return StellarSdk.Operation.changeTrust({asset: asset});
                 } else {
                   return StellarSdk.Operation.changeTrust({asset: asset,limit: limit}); 
                 }
               }

    
    function find_asset_balance(asset_array,asset_code, issuer) {
      //console.log("find_asset_balance: " + asset_code);
      //console.log(asset_array);
     // if issuer "" then ignore     
      var len = asset_array.length;
      for (var i = 0; i < len; i++) {
        if ((asset_code == "XLM" || asset_code == "native") && asset_array[i].asset_type == "native"){
          //console.log("asset XLM found bal: " + asset_array[i].balance);
          return parseFloat(asset_array[i].balance);
        }
        if (asset_code == asset_array[i].asset_code) {
          if (issuer == asset_array[i].issuer || issuer == "") {
            //console.log("asset found match" + asset_code);
            //console.log("bal: " + asset_array[i].balance);
            return parseFloat(asset_array[i].balance);
          }
        }
      }
      //console.log("no asset match found, return 0");
      return 0;        
    }

    
      gen_random_dest.addEventListener("click", function(event) {
        console.log("gen_random"); 
        update_key();        
        var new_keypair = StellarSdk.Keypair.random();
        dest_account.value = new_keypair.accountId();        
        dest_seed.value = new_keypair.seed();
        key = StellarSdk.Keypair.fromSeed(source_seed.value);
        source_account.value = key.accountId();      
      });
     
                          
      merge_all_assets.addEventListener("click", function(event) {
        update_key();
        merge_all_assets_Tx();
      });      

     update_balance.addEventListener("click", function(event) {
       update_key();
       update_balance_func();
     });

     swap_keys.addEventListener("click", function(event) {
       var temp_seed = source_seed.value;
       source_seed.value = dest_seed.value;
       dest_seed.value = temp_seed;
       update_key();
       update_balance_func();
     });

      network.onchange=function(){ //run some code when "onchange" event fires
        var chosenoption=this.options[this.selectedIndex] //this refers to "selectmenu"
        if (chosenoption.value!="nothing"){
          console.log("selected value: " + chosenoption.value);
          var host = "horizon-live.stellar.org";
          if (chosenoption.value == "testnet"){
            server = new StellarSdk.Server({     
              hostname: "horizon-testnet.stellar.org",
              port: 443,
              protocol: "https",
              secure: true
            });
            StellarSdk.Network.use(new StellarSdk.Network("Test SDF Network ; September 2015" ));
            console.log("testnet mode set");
          } else {
             server = new StellarSdk.Server({     
               hostname: "horizon-live.stellar.org",
               port: 443,
               protocol: "https",
               secure: true
             });
             StellarSdk.Network.use(new StellarSdk.Network("Public Global Stellar Network ; September 2015"));
             console.log("Live Public network mode set");
          }
        }
      }
      
  });

 

