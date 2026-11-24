-- An older SMTP failure cannot cancel a newly issued challenge.
if redis.call('TYPE', KEYS[1]).ok == 'hash' and redis.call('HGET', KEYS[1], 'issueId') == ARGV[1] then
    return redis.call('DEL', KEYS[1])
end
return 0
