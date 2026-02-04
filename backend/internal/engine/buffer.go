package engine

import (
	"container/heap"
	"time"
)

type BufferedOrder struct {
	Order         *Order
	ExecutionTime time.Time
}

type BufferHeap []BufferedOrder

func (h BufferHeap) Len() int           { return len(h) }
func (h BufferHeap) Less(i, j int) bool { return h[i].ExecutionTime.Before(h[j].ExecutionTime) }
func (h BufferHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *BufferHeap) Push(x interface{}) {
	*h = append(*h, x.(BufferedOrder))
}

func (h *BufferHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}

type FairnessBuffer struct {
	orders BufferHeap
	delay  time.Duration
}

func NewFairnessBuffer(delay time.Duration) *FairnessBuffer {
	fb := &FairnessBuffer{
		delay: delay,
	}
	heap.Init(&fb.orders)
	return fb
}

func (fb *FairnessBuffer) Add(order *Order) {
	heap.Push(&fb.orders, BufferedOrder{
		Order:         order,
		ExecutionTime: time.Now().Add(fb.delay),
	})
}

func (fb *FairnessBuffer) GetReadyOrders() []*Order {
	var ready []*Order
	now := time.Now()

	for fb.orders.Len() > 0 {
		if fb.orders[0].ExecutionTime.After(now) {
			break
		}
		item := heap.Pop(&fb.orders).(BufferedOrder)
		ready = append(ready, item.Order)
	}

	return ready
}
