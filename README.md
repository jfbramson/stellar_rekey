# stellar_rekey
Simple web app to re-key or completely move all stellar account assets from one address keypair to another.

Stellar Rekey is a simple application that allows you to move a stellar account from one account to another including all it's assets.
After all the assets are moved to the new or already existing destination account, it then removes all the trustlines from
the source account and merges the remaining native XLM into the destination account leaving the source account completely emty. 
This is also meant to simply demonstrate a method of chaining a group of event driven functions so that a group of transactions can be performed in a sequence.

By not adding any other features to the app also makes this app very small and easy to audit for those that might not trust such a function.

Note: you are expected to have copied and pasted the destination seed key to some other storage or wallet for later usage. 
The seed key is NOT stored in the app in any way.  The next time on the site the key will be gone, so be careful!!

It should also be noted that the balances shown are only the native XLM balance. To view other asset balances you need to used other tools.
This was meant just as a reference that you are looking at the correct network and that the job was completed ok.
