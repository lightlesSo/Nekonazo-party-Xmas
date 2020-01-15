#lang racket
(require net/rfc6455)
(require json)
(require "public-defines.rkt"
         (only-in "account-proc.rkt" enter-room))
#;(define (remove-room room)
	"没用"
  (define rooms-namelist 
	(filter string?
		(hash-map (name-status) 
		  (lambda (key value) 
			(if (equal? "rooms" (hash-ref value 'state '()))
				key
				'())))))
  (begin 
    (broadcast-json rooms-namelist "room" "removeroom" `#hasheq((room . ,room)))
	(room-status (hash-remove (room-status) room))))
(define (newroom room)
 (lock-room-status (thunk
  (if (hash-has-key? (room-status) room)
	#f
   (room-status (hash-set (room-status) room (hasheq 'sema (make-semaphore 1) 'names  '() 'drawsteps  '() 'gamestate "ready")))))))
(define (addroom name room)
  (if (newroom room)
      (enter-room name `#hasheq((room . ,(symbol->string room))))
      (send-json name "message" "system" '#hasheq((message . "createroomfail")))))
(define (send-current-rooms name)
	"没用"
  (define (oneroomstatus key value)
	  (make-immutable-hash (list (cons 'room (symbol->string key) )
	(cons 'peoplenum (length (hash-ref value 'names)))	  
	(cons 'roomstatus (hash-ref value 'gamestate)))))
  (define roomsstatus (hash-map  (room-status) oneroomstatus))
  ;  racket 在key为数字时 jsexpr->string会失败
  (send-json name "room" "currentrooms" `#hasheq((roomlist . ,roomsstatus))))
(define (room-proc name data)
  (match data
	((hash-table  ('type2 "addroom") ('content content-json)) (addroom name (string->symbol (hash-ref content-json 'room))))
	((hash-table  ('type2 "getcurrentrooms") ('content content-json)) (send-current-rooms name )) ;大概没用了
	))
(provide room-proc)

#|如何监听roomstatus变化 1.重写hash-set!,加上一个群发过程或者写一个新的专用set过程(甚至可以把room-status内置好像之前的自己定义的，这样完全放弃函数式改造了，不必改造，更麻烦，而且把副作用放一起。或者把整个程序当整体，也可以当成无副作用的函数，坏处是需要完全替换，通用性差，等价于每次更改时调用一下发送函数。直接重定义set！可以避免，但是需要多判断设置的是什么，更没有通用性，侵入式改造是不好的)
2，在每个分过程最前保存equal-hash-code 最后再取一次，比较不同就发送，需要改造每个函数，可以把每个分步外包一个过程，还是要多改，如果我能找到racket的监听功能就好了。不如在每次总过程的最外包上步骤，问题是因为多线程同步，可能会重复发一次，问题不大，次数大于等于1方法每次更改就发的。总感觉在这里加不太好，多一块，可惜我找不到监听功能.
是否只发送改变或改变部分？会增加复杂度，而且全发数据量也不大，而且漏了一个后面全完|#