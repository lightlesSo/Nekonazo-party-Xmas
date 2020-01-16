#lang racket
(require "public-defines.rkt")
(define (eq-hash-code-equal? hash1 hash2)
  (equal? (eq-hash-code hash1) (eq-hash-code hash2)))
(define not-obs-keys (list 'drawsteps 'sema))

(define (diff-hash old-hash new-hash #:add-sign (add '+) #:remove-sign (remove '-) #:modify-sign (modify '$))
  (define (diff old new change)
    (if (hash-empty? old)
        (append (map (lambda (k) (cons add k)) (hash-keys new))  change)
        (let ((oldK (hash-iterate-key old 0)))
          (cond ((not (hash-has-key? new oldK)) (diff (hash-remove old oldK) new (cons (cons remove oldK) change)))
                ((eq-hash-code-equal? (hash-ref old oldK) (hash-ref new oldK)) (diff (hash-remove old oldK) (hash-remove new oldK) change))
                (#t (diff (hash-remove old oldK) (hash-remove new oldK) (cons (cons modify oldK) change)))))))
  (define (proc key old-hash new-hash )
    (if (not (and (hash? new-hash) (hash? old-hash)))
        '()
        (let* (( old-hash (hash-remove-list old-hash not-obs-keys))
               ( new-hash (hash-remove-list new-hash not-obs-keys))
               (change (diff old-hash new-hash '()))
               (same (hash-remove-list old-hash (filter-map
                                                 (lambda (c) (if (eq? '+ (car c))
                                                                 #f
                                                                 (cdr c) ))
                                                 change))))
          (cons key (append change (filter (lambda (x) (and (not (null?  x)) (not (null? (cdr x)))))
                                           (hash-map same (lambda (k v)
                                                            (proc k (hash-ref old-hash k) (hash-ref new-hash k) )
                                                            ))))))))
  (cdr (proc 'root old-hash new-hash)))
(define (obs-hash get-hash fun proc)  
  " (get-hash) 因为是不可变 需要一个取得的方法
hashtable在满足条件后执行后如果变化，就执行(proc old new diflist)"
  ;甚至还可以调用自己，req携程ws步骤 内部都不用loop了， 不应该这样，混合过于严重，定时器方法和方法劫持不能携程一个函数吗
 ; 如果用法信号多线程方法，需要自己独立一个状态，保存之前的，为什么输入法只能输入第一个词 现在的方法也可以把sleep当req过程，单独里线程
  (define old-hash (get-hash))
  (begin0 (fun)
          (let ((dif-list (diff-hash old-hash (get-hash))))
            (if (null? dif-list)
                (void)
                (proc old-hash (get-hash) dif-list)))));不需要临时变量 大概 中途变了点问题也不大，而且这个步骤没有什么小号吧
(define (broadcast-room-status )
    (define rooms-namelist 
      (filter symbol?
              (hash-map (name-status) 
                        (lambda (key value) 
                          (if (equal? "rooms" (hash-ref value 'state '()))
                              key
                              '())))))
    (define (oneroomstatus key value)
      (make-immutable-hasheq (list (cons 'room (symbol->string key) )
                       (cons 'peoplenum (length (hash-ref value 'names)))	  
                       (cons 'roomstatus (hash-ref value 'gamestate)))))
    (define roomsstatus (hash-map  (room-status) oneroomstatus))
    ;(display rooms-namelist)
    (broadcast-json rooms-namelist "room" "currentrooms" `#hasheq((roomlist . ,roomsstatus)) ))
(define (obs fun)
  (define (obs-proc old-hash new-hash dif-list)
    ;(displayln dif-list)
    (broadcast-room-status))
  (obs-hash root fun obs-proc))
(provide obs)