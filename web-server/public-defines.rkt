#lang racket
(require net/rfc6455)
(require json)
(require web-server/private/timer)
(define nazo-words-list (list->vector (string->jsexpr (file->string "asset/words-from-Nekonazo0.json"))))
(define nazo-words-list-length (vector-length  nazo-words-list))
;(define (ws-pool) (make-immutable-hash))
;(define (name-status) (make-immutable-hash)); (name #hasheq((dsf . df)(.))
;(define (room-status) (make-immutable-hash)); (room #hasheq((drawsteps . df)(room . '(name name))(.))
(define root-box (box (make-immutable-hash (list (cons 'ws-pool (make-immutable-hash))
                                ( cons 'name-status (make-immutable-hash))
                                (cons 'room-status (make-immutable-hash))))))
(define root
  (case-lambda (() (unbox root-box ))
               #;((new-data) (set-box! root-box new-data))));不然provide会多出不能用的功能，或者要新建一个没有更改功能的root
;parameter是线程私有的
(define ws-pool 
  (case-lambda (() (hash-ref (root) 'ws-pool))
               ((new-data) (set-box! root-box (hash-set (root) 'ws-pool new-data)))
               ((k v ) (ws-pool (hash-set (ws-pool) k v)))
               ((k v fail) (ws-pool (hash-set (ws-pool) k v fail)));有用吗，对于更深层嵌套也没用 update也没有 就算有update 可以#: 深层也没法处理 还有remove 别了，反而会混乱，虽说能少些几个字
               ));有意义的，能覆盖大部分地区，update只是能方便取得要改的value
(define room-status 
  (case-lambda (() (hash-ref (root) 'room-status ))
               ((new-data) (set-box! root-box (hash-set (root) 'room-status  new-data)))
               ((k v ) (room-status (hash-set (room-status) k v)))
               ((k v fail) (room-status (hash-set (room-status) k v fail)))))
(define name-status
  (case-lambda (() (hash-ref (root) 'name-status))
               ((new-data) (set-box! root-box (hash-set (root) 'name-status new-data)))
               ((k v ) (name-status (hash-set (name-status) k v)))
               ((k v fail) (name-status (hash-set (name-status) k v fail)))))
(room-status (hash-set (room-status) "1" (hash 'sema (make-semaphore 1) 'names  '() 'drawsteps  '() 'gamestate "ready"))) ;;测试用
(room-status (hash-set (room-status) "2" (hash 'sema (make-semaphore 1) 'names  '() 'drawsteps  '() 'gamestate "ready")))
(define ws-pool-sema (make-semaphore 1) )
(define name-status-sema (make-semaphore 1) )
(define room-status-sema (make-semaphore 1) )
#;(define (block-sema sema) 
	(case-lambda (( proc)  (begin (semaphore-wait sema) (proc) 		(semaphore-post sema) ))
				(( proc fail) (if 	(semaphore-try-wait? sema)
									(begin (proc) (semaphore-post sema))
									(fail))) ));fail的过程应该调用call/cc 并且归还信号量
(define (lock-sema sema)
	(case-lambda ((proc) (call-with-semaphore sema proc) )
				((proc fail)  (call-with-semaphore sema proc fail))))
(define lock-ws-pool (lock-sema ws-pool-sema))
(define lock-name-status (lock-sema name-status-sema))
(define lock-room-status (lock-sema room-status-sema))
;(define room-locks (hash )) ;先新建信号量会有同步问题，建名字，房子时多写点吧 no 写 status里
;(define name-locks (hash))
(define (lock-one-room room) 
"用法 ((lock-one-room "1") (thunk))"
(lock-sema (hash-ref (hash-ref (room-status) room) 'sema)))
(define (unlock-one-room room cc proc) 
"(unlock-one-room room cc (thunk (start room)))"
(thunk (begin (semaphore-post (hash-ref (hash-ref (room-status) room) 'sema)) (cc (proc)))))
(define (lock-one-name name)
(lock-sema (hash-ref (hash-ref (name-status) name) 'sema)))  
(define (unlock-one-name name cc proc) 

(thunk (begin (semaphore-post (hash-ref (hash-ref (name-status) name) 'sema)) (cc (proc)))))
(define (name->sema name) 
(hash-ref (hash-ref (name-status) name) 'sema))
(define (room->sema room) 
(hash-ref (hash-ref (room-status) room) 'sema))
#;(define (name->client name (fail "meiyou"))
  (if (equal? fail "meiyou") ;):) :( *_* *D  '_' "_" "_' ;_; ~_~!!)
      (hash-ref (ws-pool) name) ;):) :( `_` ^_- XD  '_' "_" "_' ;_; ~_~!!)
      (hash-ref (ws-pool) name fail)))
(define name->client 
	(case-lambda ((name)(hash-ref (ws-pool) name))
		((name fail)(hash-ref (ws-pool) name fail))));这些都应该不要，但是这个可以作为一个例外 只是为了找到唯一对应关系
#;(define (room->namelist room (fail "meiyou"))
  (if (equal? fail "meiyou")
      (hash-ref (hash-ref (room-status) room ) 'names )
      (hash-ref (hash-ref (room-status) room (make-hash)) 'names fail)))
(define room->namelist
  (case-lambda ((room)(hash-ref (hash-ref (room-status) room ) 'names ))
               ((room fail) (hash-ref (hash-ref (room-status) room (hash)) 'names fail))))
#;(define (name->status name (fail "meiyou"))
  (if (equal? fail "meiyou")
      (hash-ref (name-status) name)
      (hash-ref (name-status) name fail)))
(define name->status
  (case-lambda ((name) (hash-ref (name-status) name))
               ((name fail) (hash-ref (name-status) name fail))))
#;(define (update-status! name key value (fail "meiyou"))
  (if (equal? fail "meiyou")
      ;(hash-update! (name-status) name (lambda (x)(hash-set x key value)))
      ;(hash-update! (name-status) name (lambda (x)(hash-set x key value)) fail)))
      (hash-set! (hash-ref (name-status) name) key value)
      (hash-set! (hash-ref (name-status) name fail) key value )));这行没用
#;(define update-status!
  (case-lambda ((name key value)
                (name-status
                 (hash-update (name-status) name
                              (lambda (status)
                                (with-handlers ((exn:fail? (lambda(e)(hash)))) ;读取的不是hash会报错，这样只是隐藏了错误。。不应该这样，正常程序不会有非hash值
                                  (hash-set status key value )))
                              #;`#hasheq((,key . ,value这里被前面with-handlers覆盖了)))))
               #;((name key value fail)(hash-set! (hash-ref (name-status) name fail) key value ))))
(define update-status!
  (case-lambda ((name key value)
                (name-status
                 (hash-update (name-status)
                              name
                              (lambda (status)                             
                                  (hash-set status key value ))
                              (hash))))))
(define update-room-status!
  (case-lambda ((room key value)
                (room-status
                 (hash-update (room-status)
                              room
                              (lambda (status)                             
                                  (hash-set status key value ))
                              (hash))))))
#;(define (room->roomstatus room (fail "meiyou"))
  "似乎根本没用上"
  (if (equal? fail "meiyou")
      (hash-ref (room-status) room)
      (hash-ref (room-status) room fail)))
(define room->status
  (case-lambda ((room) (hash-ref (room-status) room))
               ((room fail) (hash-ref (room-status) room fail))))

  (define (hash-remove*-proc hash keys)
    (if (null? keys)
        hash
        (hash-remove*-proc (hash-remove hash (car keys)) (cdr keys))))
(define (hash-remove-list hash list)
	(hash-remove*-proc hash list))
(define (hash-remove* hash . keys)
  (hash-remove*-proc hash keys))
  
(define (send-json to-name type type2 whole-json)
  (ws-send! (name->client to-name)
            (jsexpr->string `#hasheq((type . ,type)
                                     (type2 . ,type2) 
                                     (content . ,whole-json)))))
(define (broadcast-json name-list type type2 whole-json)
  (map (lambda (name) (send-json name type type2 whole-json)) name-list))
(define (room-broadcast #:type (accord-type 'name) accord type type2 whole-json)  
  (cond ((equal? accord-type 'name) (broadcast-json (room->namelist  (hash-ref ( name->status accord) 'room)  ) type type2 whole-json))
        ((equal? accord-type 'room) (broadcast-json (room->namelist accord ) type type2 whole-json))
        (#t (displayln "room-broadcast UNKNOW param"))))
(define (init-room room)
((lock-one-room room) (thunk
  (define this-room-status (room->status room ))
  (begin (if (hash-has-key? this-room-status 'gametimer)
             (cancel-timer!  (hash-ref this-room-status 'gametimer))
             '())
       #|  (hash-remove! this-room-status 'gametimer)   ;;;从这里开始     and  (lock 资源1 #f (thunk  (lock 资源2 (失败不等待,直接跳到最外层请求资源1那时)
         (hash-remove! this-room-status 'nazo)
         (hash-remove! this-room-status 'drawname)
         (hash-set! this-room-status 'gamestate "ready")
         (hash-set! this-room-status 'drawsteps '())|#
         (define new-room-status
           (hash-set*
            (hash-remove* this-room-status 'gametimer 'nazo 'drawname)
            'gamestate "ready" 'drawsteps '()))
         (room-status room new-room-status))))) ;因为前面用了this-room-status 单独把new-room-status转换成(new-room-status)不行
(define (send-current-rooms name)
  (define (oneroomstatus key value)
    (make-immutable-hash (list (cons 'room key) 
                     (cons 'peoplenum (length (hash-ref value 'names)))	  
                     (cons 'roomstatus (hash-ref value 'gamestate)))))
  (define roomsstatus (hash-map  (room-status) oneroomstatus))
  ;racket 在key为数字时 jsexpr->string会失效
  (send-json name "room" "currentrooms" `#hasheq((roomlist . ,roomsstatus))))

(provide (except-out (all-defined-out) root-box))