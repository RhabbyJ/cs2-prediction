-- settle.lua
-- Atomic Check-Decrement-Insert for Prediction Markets

local user_id = ARGV[1]
local order_id = ARGV[2]
local amount = tonumber(ARGV[3])
local price = ARGV[4]
local side = ARGV[5] -- "BUY_YES", "BUY_NO", etc.
local timestamp = ARGV[6]

-- 1. Check Balance
local balance_key = "user:" .. user_id .. ":balance"
local current_balance = tonumber(redis.call("GET", balance_key) or "0")

if current_balance < amount then
    return {err = "INSUFFICIENT_FUNDS"}
end

-- 2. Deduct Balance (Escrow)
redis.call("DECRBY", balance_key, amount)

-- 3. Insert Order into Book (Price-Time Priority)
-- We use ZSET for price levels: key = "market:orders:side", score = price, value = list of order IDs
local market_key = "market:orders:" .. side
redis.call("ZADD", market_key, price, order_id)

-- 4. Store Order Details
local order_key = "order:" .. order_id
redis.call("HMSET", order_key, 
    "user_id", user_id,
    "price", price,
    "amount", amount,
    "timestamp", timestamp,
    "status", "OPEN"
)

return "OK"
