"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Send, ArrowLeft, FileText, Calendar, X, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  id: number
  sender: "doctor" | "patient"
  text: string
  timestamp: Date

  // oye, XAI Fields
  explanation?: string;
  supporting_sentences?: string[];
  evidence?: { text: string; score: number }[];
  confidence?: number;
}

interface PatientDetails {
  name: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "patient",
      text: "Hello Doctor, I've been experiencing some issues.",
      timestamp: new Date(Date.now() - 3600000),
    },
  ])

  const [newMessage, setNewMessage] = useState("")
  const [response, setResponse] = useState<string | null>(null)
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null)
  // Agentic AI
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [summaryContent, setSummaryContent] = useState<string | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isBookingAppointment, setIsBookingAppointment] = useState(false)



  useEffect(() => {
    let token = localStorage.getItem("token");
    if (!token) window.location.href = "/";

    const fetchPatientDetails = async () => {
      const res = await fetch('http://localhost:5000/api/v1/doctor/patient-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })

      if (res.ok) {
        const data = await res.json()
        setPatientDetails(data)
      } else {
        console.error('Failed to fetch patient details')
      }
    }

    fetchPatientDetails()
  }, [])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() === "") return

    const newMsg: Message = {
      id: Date.now(), // Use the current timestamp as a unique id
      sender: "doctor",
      text: newMessage,
      timestamp: new Date()
    }

    setMessages((prevMessages) => [...prevMessages, newMsg])
    setNewMessage("")

    let token = localStorage.getItem("token");
    if (!token) window.location.href = "/";

    const res = await fetch('http://localhost:5000/api/v1/doctor/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ question: newMessage }),
    })

    if (res.ok) {
      const data = await res.json()

      const msg: Message = {
        id: Date.now(),
        sender: "patient",
        text: data.answer,
        timestamp: new Date(),

        // oye, XAI fields
        explanation: data.explanation,
        supporting_sentences: data.supporting_sentences,
        evidence: data.evidence,
        confidence: data.confidence,
      }

      setMessages((prevMessages) => [...prevMessages, msg])
      setNewMessage("")
    } else {
      const msg: Message = {
        id: Date.now(), // Use a new timestamp for the error message id
        sender: "patient",
        text: "Sorry, something went wrong.",
        timestamp: new Date(),
      }

      setMessages((prevMessages) => [...prevMessages, msg])
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const handleDateSelect = async (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    selectedDate.setHours(0, 0, 0, 0)
    
    // Get timezone offset in minutes
    const timezoneOffset = selectedDate.getTimezoneOffset()
    
    // Format as YYYY-MM-DD in local timezone
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const dateDay = String(selectedDate.getDate()).padStart(2, '0')
    const localDateString = `${year}-${month}-${dateDay}`
    
    // Get timezone name
    const timezoneFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    setIsBookingAppointment(true)
    try {
      let token = localStorage.getItem("token")
      if (!token) {
        window.location.href = "/"
        return
      }

      const res = await fetch('http://localhost:5000/api/v1/doctor/booking-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          appointment_date: localDateString,
          timezone: userTimezone,
          timezone_offset: timezoneOffset
        }),
      })

      if (res.ok) {
        const data = await res.json()
        
        const reminderRes = await fetch('http://localhost:5000/api/v1/doctor/appointment-reminder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            appointment_date: localDateString,
            timezone: userTimezone,
            timezone_offset: timezoneOffset
          }),
        })

        let successMsg: Message
        if (reminderRes.ok) {
          successMsg = {
            id: Date.now(),
            sender: "patient",
            text: `Appointment successfully booked for ${selectedDate.toDateString()}! A reminder email has been sent.`,
            timestamp: new Date(),
          }
        } else {
          successMsg = {
            id: Date.now(),
            sender: "patient",
            text: `Appointment successfully booked for ${selectedDate.toDateString()}!`,
            timestamp: new Date(),
          }
        }
        
        setMessages((prevMessages) => [...prevMessages, successMsg])
        setShowCalendarModal(false)
      } else {
        const errorMsg: Message = {
          id: Date.now(),
          sender: "patient",
          text: "Failed to book appointment. Please try again.",
          timestamp: new Date(),
        }
        setMessages((prevMessages) => [...prevMessages, errorMsg])
      }
    } catch (error) {
      console.error('Error booking appointment:', error)
      const errorMsg: Message = {
        id: Date.now(),
        sender: "patient",
        text: "An error occurred while booking the appointment.",
        timestamp: new Date(),
      }
      setMessages((prevMessages) => [...prevMessages, errorMsg])
    } finally {
      setIsBookingAppointment(false)
    }
  }

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const handleSummarizeReport = async () => {
    setIsLoadingSummary(true)
    try {
      let token = localStorage.getItem("token")
      if (!token) {
        window.location.href = "/"
        return
      }

      const res = await fetch('http://localhost:5000/api/v1/doctor/summarize-report', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })

      if (res.ok) {
        const data = await res.json()
        setSummaryContent(data.summary)
        setShowSummaryModal(true)
      } else {
        const errorMsg: Message = {
          id: Date.now(),
          sender: "patient",
          text: "Failed to generate report summary. Please try again.",
          timestamp: new Date(),
        }
        setMessages((prevMessages) => [...prevMessages, errorMsg])
      }
    } catch (error) {
      console.error('Error summarizing report:', error)
      const errorMsg: Message = {
        id: Date.now(),
        sender: "patient",
        text: "An error occurred while summarizing the report.",
        timestamp: new Date(),
      }
      setMessages((prevMessages) => [...prevMessages, errorMsg])
    } finally {
      setIsLoadingSummary(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-red-700 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" className="text-white hover:bg-red-600 p-2 mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">MediConnect</h1>
          </div>
          <div className="flex items-center space-x-2">
            {patientDetails && (
              <div className="text-right">
                <p className="font-medium">{patientDetails.name}</p>
              </div>
            )}
            <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center">
              <span className="font-bold">{patientDetails ? patientDetails.name.slice(0, 2).toUpperCase() : "N/A"}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex max-w-7xl mx-auto w-full">
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <div className="border-b border-gray-200 bg-white">
              <div className="px-4 py-2 max-w-7xl mx-auto">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="chat" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                    Chat
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="chat" className="flex-1 flex flex-col p-4 space-y-4 overflow-auto">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === "doctor" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${message.sender === "doctor" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        <p>{message.text}</p>
                        {/*oye XAI panel (ONLY for AI messages) */}
                        {message.sender === "patient" && message.explanation && (
                          <div className="mt-3 space-y-2 text-sm bg-white border rounded p-3">

                            {/* Confidence */}
                            <p className="text-xs text-gray-500">
                              Confidence: {(message.confidence ?? 0).toFixed(2)}
                            </p>

                            {/* Explanation */}
                            <div>
                              <p className="font-semibold">Explanation:</p>
                              <p className="text-gray-700">{message.explanation}</p>
                            </div>

                            {/* Supporting sentences */}
                            {Array.isArray(message.supporting_sentences) && message.supporting_sentences.length > 0 && (
                              <div>
                                <p className="font-semibold">Supporting Evidence:</p>
                                <ul className="list-disc pl-5">
                                  {message.supporting_sentences.map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Retrieved evidence */}
                            {Array.isArray(message.evidence) && message.evidence.length > 0 && (
                              <div>
                                <p className="font-semibold mb-1">Retrieved Chunks:</p>
                                <ScrollArea className="h-28 border rounded p-2">
                                  {message.evidence.map((ev, idx) => (
                                    <div key={idx} className="mb-2 pb-2 border-b">
                                      <p className="text-xs">{ev.text.slice(0, 250)}...</p>
                                      <p className="text-[10px] text-gray-500">
                                        Score: {ev.score.toFixed(3)}
                                      </p>
                                    </div>
                                  ))}
                                </ScrollArea>
                              </div>
                            )}

                            {/* Low confidence warning */}
                            {(message.confidence ?? 1) < 0.45 && (
                              <div className="mt-2 p-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 text-xs rounded">
                                ⚠ Low confidence — answer may be unreliable.
                              </div>
                            )}
                          </div>
                        )}
                        <p
                          className={`text-xs mt-1 text-right ${message.sender === "doctor" ? "text-red-100" : "text-gray-500"
                            }`}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {/* {response && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-800">
                        <p>{response}</p>
                      </div>
                    </div>
                  )} */}
                </div>
              </ScrollArea>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={handleSummarizeReport}
                  disabled={isLoadingSummary}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 p-0.5 transition-all hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-600 opacity-0 group-hover:opacity-20 transition-opacity" />
                  <div className="relative px-4 py-3 bg-gradient-to-br from-red-500 to-red-700 rounded-[10px] flex flex-col items-center justify-center text-white transition-all group-hover:from-red-600 group-hover:to-red-800">
                    <div className="flex items-center justify-center mb-2">
                      <FileText className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-sm text-center">
                      {isLoadingSummary ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⟳</span>
                          Generating...
                        </>
                      ) : (
                        "Report Summarizer"
                      )}
                    </span>
                    <span className="text-xs text-red-100 mt-1">Analyze & Summarize</span>
                  </div>
                </button>

                <button
                  onClick={() => setShowCalendarModal(true)}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 p-0.5 transition-all hover:shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-600 opacity-0 group-hover:opacity-20 transition-opacity" />
                  <div className="relative px-4 py-3 bg-gradient-to-br from-red-600 to-red-800 rounded-[10px] flex flex-col items-center justify-center text-white transition-all group-hover:from-red-700 group-hover:to-red-900">
                    <div className="flex items-center justify-center mb-2">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-sm text-center">
                      Book Appointment
                    </span>
                    <span className="text-xs text-red-100 mt-1">Schedule a Visit</span>
                  </div>
                </button>
              </div>


              <Card className="border-0 bg-gradient-to-r from-red-50 to-red-100 shadow-md overflow-hidden">
                <CardContent className="p-4">
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="w-full border-2 border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 transition-all"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={newMessage.trim() === ""}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md hover:shadow-lg transition-all rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white rounded-lg shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <FileText className="h-6 w-6 mr-2" />
                Patient Report Summary
              </h2>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-white hover:bg-red-800 p-2 rounded-lg transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-6 pr-4 text-gray-700 leading-relaxed max-h-full">
                {summaryContent && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold text-gray-800 mb-3 mt-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-2" {...props} />,
                        p: ({node, ...props}) => <p className="text-gray-700 mb-3 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 text-gray-700" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 text-gray-700" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                        em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                        code: ({node, ...props}) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-red-600" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-red-600 pl-4 italic text-gray-600 my-3" {...props} />,
                        table: ({node, ...props}) => <table className="border-collapse border border-gray-300 w-full my-3" {...props} />,
                        th: ({node, ...props}) => <th className="border border-gray-300 bg-gray-100 p-2 font-bold text-left" {...props} />,
                        td: ({node, ...props}) => <td className="border border-gray-300 p-2" {...props} />,
                      }}
                    >
                      {summaryContent}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-6 border-t border-red-100 bg-gradient-to-r from-red-50 to-red-100 flex gap-3">
              <Button
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold transition-all rounded-lg shadow-md hover:shadow-lg"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  if (summaryContent) {
                    navigator.clipboard.writeText(summaryContent)
                    alert("Summary copied to clipboard!")
                  }
                }}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold transition-all rounded-lg shadow-md hover:shadow-lg"
              >
                Copy Summary
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border-0">
            <div className="p-6 border-b-2 border-red-100 bg-gradient-to-r from-red-600 via-red-700 to-red-800">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <Calendar className="h-6 w-6 mr-3" />
                  Select Date
                </h2>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="text-white hover:bg-red-900 p-2 rounded-lg transition duration-200 transform hover:scale-110"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-red-100 text-sm mt-2">Choose your appointment date</p>
            </div>
            <div className="p-6 bg-gradient-to-b from-white to-red-50">
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-2 hover:bg-red-100 rounded-lg transition duration-200 transform hover:scale-110"
                >
                  <ChevronLeft className="h-5 w-5 text-red-600 font-bold" />
                </button>
                <h3 className="text-xl font-bold text-red-800 min-w-48 text-center">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-2 hover:bg-red-100 rounded-lg transition duration-200 transform hover:scale-110"
                >
                  <ChevronRight className="h-5 w-5 text-red-600 font-bold" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-4 pb-4 border-b border-red-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-bold text-red-600 text-xs py-2 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array(getFirstDayOfMonth(currentMonth))
                  .fill(null)
                  .map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                {Array(getDaysInMonth(currentMonth))
                  .fill(null)
                  .map((_, i) => {
                    const day = i + 1
                    const disabled = isDateDisabled(day)
                    return (
                      <button
                        key={day}
                        onClick={() => !disabled && handleDateSelect(day)}
                        disabled={disabled || isBookingAppointment}
                        className={`aspect-square rounded-lg font-semibold transition-all duration-200 transform ${
                          disabled
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-gradient-to-br from-red-100 to-red-200 text-gray-800 hover:from-red-500 hover:to-red-600 hover:text-white hover:shadow-lg hover:scale-105 cursor-pointer'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
              </div>
            </div>
            <div className="p-6 border-t-2 border-red-100 bg-gradient-to-r from-red-50 to-red-100 flex gap-3">
              <Button
                onClick={() => setShowCalendarModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold transition-all rounded-lg shadow-md hover:shadow-lg"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

