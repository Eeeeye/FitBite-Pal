-- One key owns both the challenge and its resend window.
local key = KEYS[1]
local now = tonumber(redis.call('TIME')[1])
if redis.call('TYPE', key).ok == 'hash' then
    local nextSend = tonumber(redis.call('HGET', key, 'nextSend') or '0')
    if now < nextSend then return 0 end
end
redis.call('DEL', key)
redis.call('HSET', key, 'code', ARGV[1], 'issueId', ARGV[2], 'failures', 0,
           'nextSend', now + tonumber(ARGV[4]))
redis.call('EXPIRE', key, ARGV[3])
return 1
