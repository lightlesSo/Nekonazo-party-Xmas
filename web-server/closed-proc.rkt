#lang racket
(require net/rfc6455)
(require json)
(require "public-defines.rkt"
 (only-in "account-proc.rkt" exit-room))
(require web-server/private/timer)

(define (closed-proc name client reason)
	"关闭时关闭连接，在ws-pool里删去记录"
  (begin
    (ws-close! client)
    (if (and (hash-has-key? (hash-ref (name-status) name) 'room)(not (equal? "notroom"(hash-ref (hash-ref (name-status) name) 'room))))
		 (exit-room name '())
        '())
   
    ;(hash-remove! (ws-pool) name)
    ;(hash-remove! (name-status) name)
    (ws-pool (hash-remove (ws-pool) name))
    (name-status (hash-remove (name-status) name))
    (display (cons "status"(ws-conn-close-status client)))
    (display (cons "reason"(ws-conn-close-reason client)))
  ))
(provide closed-proc)