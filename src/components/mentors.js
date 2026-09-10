"use client"

import React from 'react';
import { Linkedin } from 'lucide-react';
import "./styles/mentors.css";
import StackedText from './StackedText';

const team = [
  {
    name: 'Saahil Zameer Shaik',
    position: 'Founder & CEO',
    linkedinProfile: 'https://www.linkedin.com/in/saahil-zameer/',
    id: 'saahil'
  },
  {
    name: 'Mohammad Suhana',
    position: 'Co-Founder',
    linkedinProfile: 'https://www.linkedin.com/in/mohammad-suhana/',
    id: 'suhana'
  },
  {
    name: 'Amarnadh Reddy Nanubala',
    position: 'Chief Technology Officer',
    linkedinProfile: 'https://www.linkedin.com/in/amarnadh-reddy/',
    id: 'amarnadh'
  },
  {
    name: 'Meghana Thipanni',
    position: 'Chief Operating Officer',
    linkedinProfile: 'https://www.linkedin.com/in/meghana-thipanni/',
    id: 'meghana'
  },
  {
    name: 'Prabhas Banavath',
    position: 'Chief Marketing Officer',
    linkedinProfile: 'https://www.linkedin.com/in/prabhas-banavath/',
    id: 'prabhas'
  },
  {
    name: 'Nomula Ananya Reddy',
    position: 'Chief Brand & Business Officer',
    linkedinProfile: 'https://www.linkedin.com/in/ananya-reddy/',
    id: 'ananya'
  },
];

const MentorCard = ({ mentor, index }) => {
  const initial = mentor.name.charAt(0);
  return (
    <div
      id={mentor.id}
      className={`card ${index % 2 === 0 ? 'card-up' : 'card-down'}`}
    >
      <span className="card-initial">{initial}</span>
      <div className="card-content">
        <div className="description">
          <h4>{mentor.name}</h4>
          <p>{mentor.position}</p>
          <div className="social-links">
            <a href={mentor.linkedinProfile} target="_blank" rel="noopener noreferrer">
              <Linkedin size={20} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const Mentors = () => {
  return (
    <div className="wrapper bg-darkgrey">
      <div className="container px-5">
        <h1 className='my-9 text-4xl w-full text-center flex items-center justify-center'>
          <StackedText text="OUR TEAM" fontSize='80px' />
        </h1>
        {[0, 1].map((rowIndex) => (
          <div key={rowIndex} className="row">
            {team.slice(rowIndex * 3, (rowIndex + 1) * 3).map((mentor, index) => (
              <MentorCard key={mentor.id} mentor={mentor} index={index + rowIndex * 3} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Mentors;
