"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Markdown from 'react-markdown';
import "./styles/chatbot.css";

const Chatbot = ({ chatHistory, setChatHistory }) => {
    console.log('Chatbot component rendered');
    const [userMessage, setUserMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatWindowRef = useRef(null);

    const promptTechiesContext = `
bot_identity:
  name: "Ask Prompt Techies"
  creator: "Prompt Techies (TROVO FI PRIVATE LIMITED)"
  primary_role: "Assist students, developers, colleges, and partners with questions about Prompt Techies, our AI workshops, hackathons, bootcamps, and startup incubation."

company_info:
  name: "Prompt Techies"
  legal_name: "TROVO FI PRIVATE LIMITED"
  status: "DPIIT Recognized Startup & MSME Registered Company"
  headquarters: "Bachupally, Medchal-Malkajgiri District, Hyderabad, Telangana, India - 500090"
  website: "https://prompttechies.in"
  email: "contact@prompttechies.in / prompttechies@gmail.com"
  phone: "+91 8008087702"
  tagline: "Built for developers who want more than just a degree | Dream. Develop. Deploy. ⚡ | Where Skills Pay the Bills"

leadership_team:
  ceo: "Saahil Zameer Shaik (Founder & Chief Executive Officer)"
  co_founder: "Mohammad Suhana (Co-Founder)"
  cto: "Amarnadh Reddy Nanubala (Chief Technology Officer)"
  coo: "Meghana Thipanni (Chief Operating Officer)"
  cmo: "Prabhas Banavath (Chief Marketing Officer)"
  cbbo: "Nomula Ananya Reddy (Chief Brand & Business Officer)"

programs_and_learning:
  ai_bootcamps: "Hands-on Generative AI, LLMs, Machine Learning, Prompt Engineering, Cloud, and Automation."
  hackathons: "High-energy national and campus hackathons where students prototype and deploy real solutions."
  startup_node: "5-stage startup roadmap: Discover -> Validate -> Build -> Launch -> Scale."
  campus_chapters: "Partnering with colleges to bring AI innovation labs, bootcamps, and coding challenges."
  career_readiness: "Portfolio audits, live engineering projects, and internship placements."

mentor_network:
  companies: "Mentors from Google, Microsoft, Meta, Amazon, Uber, Nvidia, Netflix, Apple, Oracle, Adobe, and Tesla."

response_guidelines:
  - "Answer concisely, confidently, and technically grounded."
  - "Highlight Prompt Techies' AI-first mission and practical builder mindset."
  - "Direct users to Innovation Programs for course details."
  - "Direct to https://forms.gle/L2rvjg4DvLUY6PR26 or contact@prompttechies.in for registrations."
  - "Maintain professional, encouraging, developer-first tone."
`;

  const typeMessage = async (message) => {
    let currentMessage = '';
    setIsTyping(true);
    
    for (let i = 0; i < message.length; i++) {
        currentMessage += message[i];
        await new Promise(resolve => setTimeout(resolve, 30));
        setChatHistory(prevChatHistory => {
            const lastMessage = prevChatHistory[prevChatHistory.length - 1];
            if (lastMessage && lastMessage.sender === 'bot') {
                lastMessage.message = currentMessage;
                return [...prevChatHistory];
            } else {
                return [...prevChatHistory, { sender: 'bot', message: currentMessage }];
            }
        });
    }
    
    setIsTyping(false);
};

useEffect(() => {
    if (chatHistory.length === 0) {
        const welcomeMessage = "Hello! I'm Ask Prompt Techies, here to assist you with questions about Prompt Techies, our AI workshops, hackathons, bootcamps, and startup incubation. How can I help you today?";
        typeMessage(welcomeMessage);
    }
}, []);

const sendMessage = async () => {
    if (userMessage.trim() === '' || isTyping) return;

    const updatedHistory = [...chatHistory, { sender: 'user', message: userMessage }];
    setChatHistory(updatedHistory);
    setUserMessage('');
    setIsTyping(true);

    try {
        const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

        const messages = [
            { role: "system", content: promptTechiesContext },
            ...updatedHistory.map(chat => ({
                role: chat.sender === 'user' ? 'user' : 'assistant',
                content: chat.message
            }))
        ];

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            { 
                messages, 
                model: 'llama3-8b-8192',
                temperature: 0.7,
                max_tokens: 150
            },
            { 
                headers: { 
                    Authorization: `Bearer ${groqApiKey}`, 
                    'Content-Type': 'application/json' 
                } 
            }
        );

        const botMessage = response.data.choices[0].message.content;
        await typeMessage(botMessage);
    } catch (error) {
        console.error('Error sending message:', error.response || error.message);
        await typeMessage('Sorry, something went wrong. Please try again later.');
    }
};

const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isTyping) {
        sendMessage();
    }
};

useEffect(() => {
    console.log('Chat history updated:', chatHistory);
    if (chatWindowRef.current) {
        chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
}, [chatHistory]);

return (
    <div className="chatbot">
        <div className="chat-window" ref={chatWindowRef}>
            {chatHistory.map((chat, index) => (
                <div key={index} className={`chat-message ${chat.sender}-message`}>
                    {chat.sender === 'user' ? 'You' : 'Ask Prompt Techies'} <Markdown>{chat.message}</Markdown>
                </div>
            ))}
        </div>
        <div className="input">
            <input
                type="text"
                value={userMessage}
                onChange={(e) => {
                    console.log('User input changed:', e.target.value);
                    setUserMessage(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type your message"
                disabled={false} 
            />
            <button 
                onClick={sendMessage} 
                disabled={isTyping || userMessage.trim() === ''}
            >
                <i className="ri-send-plane-2-fill"></i>
            </button>
        </div>
    </div>
);
};

export default Chatbot;