local key = KEYS[1]
local kind = redis.call('TYPE', key).ok
if kind == 'none' then return 0 end

-- Accept live codes from the previous release without extending their lifetime.
if kind == 'string' then
    local ttl = redis.call('PTTL', key)
    if ttl <= 0 then return 0 end
    local code = redis.call('GET', key)
    redis.call('DEL', key)
    redis.call('HSET', key, 'code', code, 'failures', 0)
    redis.call('PEXPIRE', key, ttl)
end

local code = redis.call('HGET', key, 'code')
if not code then return 0 end
if code == ARGV[1] then
    if ARGV[2] == '1' then redis.call('HDEL', key, 'code') end
    return 1
end
if redis.call('HINCRBY', key, 'failures', 1) >= tonumber(ARGV[3]) then
    redis.call('HDEL', key, 'code')
end
return 0
